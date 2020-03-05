/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { notFound, notImplemented } from 'boom';
import { ElasticsearchServiceSetup } from 'kibana/server';
import { get } from 'lodash';
import { CSV_FROM_SAVEDOBJECT_JOB_TYPE } from '../../../../common/constants';
import { ReportingCore } from '../../../../server';
import { cryptoFactory } from '../../../../server/lib';
import {
  CreateJobFactory,
  ImmediateCreateJobFn,
  Logger,
  RequestFacade,
  ServerFacade,
} from '../../../../types';
import {
  JobDocPayloadPanelCsv,
  JobParamsPanelCsv,
  SavedObject,
  SavedObjectServiceError,
  SavedSearchObjectAttributesJSON,
  SearchPanel,
  TimeRangeParams,
  VisObjectAttributesJSON,
} from '../../types';
import { createJobSearch } from './create_job_search';

interface VisData {
  title: string;
  visType: string;
  panel: SearchPanel;
}

export const createJobFactory: CreateJobFactory<ImmediateCreateJobFn<
  JobParamsPanelCsv
>> = function createJobFactoryFn(
  reporting: ReportingCore,
  server: ServerFacade,
  elasticsearch: ElasticsearchServiceSetup,
  parentLogger: Logger
) {
  const crypto = cryptoFactory(server);
  const logger = parentLogger.clone([CSV_FROM_SAVEDOBJECT_JOB_TYPE, 'create-job']);

  return async function createJob(
    jobParams: JobParamsPanelCsv,
    headers: any,
    req: RequestFacade
  ): Promise<JobDocPayloadPanelCsv> {
    const { savedObjectType, savedObjectId } = jobParams;
    const serializedEncryptedHeaders = await crypto.encrypt(headers);
    const client = req.getSavedObjectsClient();

    const { panel, title, visType }: VisData = await Promise.resolve()
      .then(() => client.get(savedObjectType, savedObjectId))
      .then(async (savedObject: SavedObject) => {
        const { attributes, references } = savedObject;
        const {
          kibanaSavedObjectMeta: kibanaSavedObjectMetaJSON,
        } = attributes as SavedSearchObjectAttributesJSON;
        const { timerange } = req.payload as { timerange: TimeRangeParams };

        if (!kibanaSavedObjectMetaJSON) {
          throw new Error('Could not parse saved object data!');
        }

        const kibanaSavedObjectMeta = {
          ...kibanaSavedObjectMetaJSON,
          searchSource: JSON.parse(kibanaSavedObjectMetaJSON.searchSourceJSON),
        };

        const { visState: visStateJSON } = attributes as VisObjectAttributesJSON;
        if (visStateJSON) {
          throw notImplemented('Visualization types are not yet implemented');
        }

        // saved search type
        return await createJobSearch(timerange, attributes, references, kibanaSavedObjectMeta);
      })
      .catch((err: Error) => {
        const boomErr = (err as unknown) as { isBoom: boolean };
        if (boomErr.isBoom) {
          throw err;
        }
        const errPayload: SavedObjectServiceError = get(err, 'output.payload', { statusCode: 0 });
        if (errPayload.statusCode === 404) {
          throw notFound(errPayload.message);
        }
        if (err.stack) {
          logger.error(err.stack);
        }
        throw new Error(`Unable to create a job from saved object data! Error: ${err}`);
      });

    return {
      headers: serializedEncryptedHeaders,
      jobParams: { ...jobParams, panel, visType },
      type: null,
      title,
    };
  };
};
