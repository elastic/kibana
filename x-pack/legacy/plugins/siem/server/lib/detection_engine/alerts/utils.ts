/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse, SearchHit, SignalHit } from '../../types';
import { AlertExecutorOptions } from '../../../../../alerting';
import { Logger } from '../../../../../../../../src/core/server';
import { AlertServices } from '../../../../../alerting/server/types';

export class ScrollAndBulkIndex {
  service: AlertServices;
  logger: Logger;
  signalParams: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(service: AlertServices, params: Record<string, any>, logger: Logger) {
    this.service = service;
    this.logger = logger;
    this.signalParams = params;
  }

  // format scroll search result for signals index.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  buildBulkBody(doc: SearchHit): SignalHit {
    const indexPatterns = this.signalParams.index
      .map((element: string) => `"${element}"`)
      .join(',');
    const refs = this.signalParams.references.map((element: string) => `"${element}"`).join(',');
    return {
      ...doc._source,
      signal: {
        rule_revision: 1,
        rule_id: this.signalParams.id,
        rule_type: this.signalParams.type,
        parent: {
          id: doc._id,
          type: 'event',
          depth: 1,
        },
        name: this.signalParams.name,
        severity: this.signalParams.severity,
        description: this.signalParams.description,
        time_detected: Date.now(),
        index_patterns: indexPatterns,
        references: refs,
      },
    };
  }
  async singleBulkIndex(sr: SearchResponse<object>): Promise<boolean> {
    const bulkBody = sr.hits.hits.flatMap((doc: SearchHit) => [
      {
        index: {
          _index: process.env.SIGNALS_INDEX || '.siem-signals-10-01-2019',
          _id: doc._id,
        },
      },
      this.buildBulkBody(doc),
    ]);
    const firstResult = await this.service.callCluster('bulk', {
      refresh: true,
      body: bulkBody,
    });
    if (firstResult.errors) {
      this.logger.error(
        `[-] bulkResponse had errors: ${JSON.stringify(firstResult.errors, null, 2)}}`
      );
      return false;
    }
    return true;
  }

  async singleScroll(scrollId: string | undefined): Promise<SearchResponse<object>> {
    try {
      const nextScrollResult = await this.service.callCluster('scroll', {
        scroll: this.signalParams.scroll,
        scrollId,
      });
      return nextScrollResult;
    } catch (exc) {
      this.logger.error(`[-] nextScroll threw an error ${exc}`);
      throw exc;
    }
  }

  async bulkIndex(someResult: SearchResponse<object>): Promise<boolean> {
    this.logger.info('[+] starting bulk insertion');
    const firstBulkIndexSuccess = await this.singleBulkIndex(someResult);
    if (!firstBulkIndexSuccess) {
      this.logger.error('[-] First bulk index threw an error');
      return false;
    }
    while (true) {
      try {
        // reusing scroll id from initial call
        const scrollResult = await this.singleScroll(someResult._scroll_id);
        if (scrollResult.hits.hits.length === 0) {
          this.logger.info('[+] Finished indexing signals');
          return true;
        }
        const bulkSuccess = await this.singleBulkIndex(scrollResult);
        if (!bulkSuccess) {
          this.logger.error('[-] bulk index failed');
        }
      } catch (exc) {
        this.logger.error('[-] scroll and bulk threw an error');
        return false;
      }
    }
  }
}
