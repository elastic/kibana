/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, ElasticsearchClient } from '@kbn/core/server';
import type { Logger as KibanaLogger } from '@kbn/logging';
import { Logger as LoggerToken } from '@kbn/core-di';
import { inject, injectable } from 'inversify';
import type {
  ClusterPutComponentTemplateRequest,
  IndicesPutIndexTemplateRequest,
} from '@elastic/elasticsearch/lib/api/types';
import { errors } from '@elastic/elasticsearch';
import { CoreSetup } from '@kbn/core-di-server';

import { AlertingRetryService } from './retry_service/alerting_retry_service';
import type { AlertingServerStartDependencies } from '../../types';
import { ALERT_EVENTS_INDEX } from '../rule_executor/constants';
import {
  DEFAULT_ALERTS_ILM_POLICY,
  DEFAULT_ALERTS_ILM_POLICY_NAME,
  alertsWrittenFieldsMappings,
} from '../rule_executor/resources';

const TOTAL_FIELDS_LIMIT = 2500;

function getEsErrorStatusCode(error: unknown): number | undefined {
  return error instanceof errors.ResponseError ? error.meta.statusCode : undefined;
}

@injectable()
export class AlertingResourcesService {
  private initialization?: Promise<void>;
  private initialized = false;

  constructor(
    @inject(LoggerToken) private readonly logger: KibanaLogger,
    @inject(CoreSetup('getStartServices'))
    private readonly getStartServices: () => Promise<
      [CoreStart, AlertingServerStartDependencies, unknown]
    >,
    @inject(AlertingRetryService) private readonly retryService: AlertingRetryService
  ) {}

  public startInitialization({ enabled }: { enabled: boolean }) {
    if (!enabled) return;
    if (this.initialization) return;

    this.initialization = (async () => {
      const [coreStart] = await this.getStartServices();
      const esClient = coreStart.elasticsearch.client.asInternalUser;
      await this.installResources({ esClient });
      this.initialized = true;
    })();
  }

  /**
   * Wait until resources are ready. This should be a fast no-op after initialization completes.
   */
  public async waitUntilReady() {
    await this.initialization;
  }

  public isReady() {
    return this.initialized;
  }

  private async installResources({ esClient }: { esClient: ElasticsearchClient }) {
    const dataStreamName = ALERT_EVENTS_INDEX;
    const componentTemplateName = `${dataStreamName}-schema@component`;
    const indexTemplateName = `${dataStreamName}-schema@index-template`;

    const componentTemplate: ClusterPutComponentTemplateRequest = {
      name: componentTemplateName,
      template: {
        settings: { mode: 'lookup' },
        mappings: alertsWrittenFieldsMappings,
      },
      _meta: {
        managed: true,
        description: `${dataStreamName} written-fields schema (alerting_v2 / ES|QL)`,
      },
    };

    const indexTemplate: IndicesPutIndexTemplateRequest = {
      name: indexTemplateName,
      index_patterns: [dataStreamName],
      data_stream: {},
      composed_of: [componentTemplateName],
      priority: 500,
      template: {
        settings: {
          'index.lifecycle.name': DEFAULT_ALERTS_ILM_POLICY_NAME,
          'index.mapping.total_fields.limit': TOTAL_FIELDS_LIMIT,
          'index.mapping.total_fields.ignore_dynamic_beyond_limit': true,
        },
      },
      _meta: {
        managed: true,
        description: `${dataStreamName} index template (alerting_v2 / ES|QL)`,
      },
    };

    await Promise.all([
      (async () => {
        this.logger.debug(`Installing ILM policy ${DEFAULT_ALERTS_ILM_POLICY_NAME}`);
        await this.retryService.retry(() =>
          esClient.ilm.putLifecycle({
            name: DEFAULT_ALERTS_ILM_POLICY_NAME,
            policy: DEFAULT_ALERTS_ILM_POLICY,
          })
        );
      })(),
      (async () => {
        this.logger.debug(`Installing component template ${componentTemplateName}`);
        await this.retryService.retry(() =>
          esClient.cluster.putComponentTemplate(componentTemplate)
        );
      })(),
    ]);

    this.logger.debug(`Installing index template ${indexTemplateName}`);
    await this.retryService.retry(() => esClient.indices.putIndexTemplate(indexTemplate));

    // Data stream creation (idempotent).
    await this.retryService.retry(async () => {
      try {
        await esClient.indices.createDataStream({ name: dataStreamName });
        this.logger.debug(`Created alerts data stream [${dataStreamName}]`);
      } catch (e) {
        // ignore "already exists"
        const status = getEsErrorStatusCode(e);
        if (status !== 400 && status !== 409) {
          throw e;
        }
      }
    });
  }
}
