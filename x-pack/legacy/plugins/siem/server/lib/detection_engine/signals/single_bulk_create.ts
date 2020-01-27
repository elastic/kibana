/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { performance } from 'perf_hooks';
import { AlertServices } from '../../../../../alerting/server/types';
import { SignalSearchResponse, BulkResponse } from './types';
import { RuleTypeParams } from '../types';
import { generateId } from './utils';
import { buildBulkBody } from './build_bulk_body';
import { Logger } from '../../../../../../../../src/core/server';

interface SingleBulkCreateParams {
  someResult: SignalSearchResponse;
  ruleParams: RuleTypeParams;
  services: AlertServices;
  logger: Logger;
  id: string;
  signalsIndex: string;
  name: string;
  createdBy: string;
  updatedBy: string;
  interval: string;
  enabled: boolean;
  tags: string[];
}

// Bulk Index documents.
export const singleBulkCreate = async ({
  someResult,
  ruleParams,
  services,
  logger,
  id,
  signalsIndex,
  name,
  createdBy,
  updatedBy,
  interval,
  enabled,
  tags,
}: SingleBulkCreateParams): Promise<boolean> => {
  if (someResult.hits.hits.length === 0) {
    return true;
  }
  // index documents after creating an ID based on the
  // source documents' originating index, and the original
  // document _id. This will allow two documents from two
  // different indexes with the same ID to be
  // indexed, and prevents us from creating any updates
  // to the documents once inserted into the signals index,
  // while preventing duplicates from being added to the
  // signals index if rules are re-run over the same time
  // span. Also allow for versioning.
  const bulkBody = someResult.hits.hits.flatMap(doc => [
    {
      create: {
        _index: signalsIndex,
        _id: generateId(
          doc._index,
          doc._id,
          doc._version ? doc._version.toString() : '',
          ruleParams.ruleId ?? ''
        ),
      },
    },
    buildBulkBody({ doc, ruleParams, id, name, createdBy, updatedBy, interval, enabled, tags }),
  ]);
  const time1 = performance.now();
  const firstResult: BulkResponse = await services.callCluster('bulk', {
    index: signalsIndex,
    refresh: false,
    body: bulkBody,
  });
  const time2 = performance.now();
  logger.debug(
    `individual bulk process time took: ${Number(time2 - time1).toFixed(2)} milliseconds`
  );
  logger.debug(`took property says bulk took: ${firstResult.took} milliseconds`);
  if (firstResult.errors) {
    // go through the response status errors and see what
    // types of errors they are, count them up, and log them.
    const errorCountMap = firstResult.items.reduce((acc: { [key: string]: number }, item) => {
      if (item.create.error) {
        const responseStatusKey = item.create.status.toString();
        acc[responseStatusKey] = acc[responseStatusKey] ? acc[responseStatusKey] + 1 : 1;
      }
      return acc;
    }, {});
    /*
     the logging output below should look like
     {'409': 55}
     which is read as "there were 55 counts of 409 errors returned from bulk create"
    */
    logger.error(
      `[-] bulkResponse had errors with response statuses:counts of...\n${JSON.stringify(
        errorCountMap,
        null,
        2
      )}`
    );
  }
  return true;
};
