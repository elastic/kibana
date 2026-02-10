/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { ServiceParams } from '@kbn/actions-plugin/server';
import { SubActionConnector } from '@kbn/actions-plugin/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { fullJitterBackoffFactory } from '@kbn/response-ops-retry-service';
import type { CasesConnectorConfig, CasesConnectorRunParams, CasesConnectorSecrets } from './types';
import { ZCasesConnectorRunParamsSchema } from './schema';
import { CasesOracleService } from './cases_oracle_service';
import { CasesService } from './cases_service';
import type { CasesClient } from '../../client';
import {
  CasesConnectorError,
  createTaskUserError,
  isCasesClientError,
  isCasesConnectorError,
} from './cases_connector_error';
import { CasesConnectorExecutor } from './cases_connector_executor';
import { CasesConnectorRetryService } from './cases_connector_retry_service';
import { CASE_RULES_SAVED_OBJECT, CASES_CONNECTOR_SUB_ACTION } from '../../../common/constants';
import { getSavedObjectsTypes } from '../../../common';

interface CasesConnectorParams {
  connectorParams: ServiceParams<CasesConnectorConfig, CasesConnectorSecrets>;
  casesParams: {
    getCasesClient: (request: KibanaRequest) => Promise<CasesClient>;
    getSpaceId: (request?: KibanaRequest) => string;
    getUnsecuredSavedObjectsClient: (
      request: KibanaRequest,
      savedObjectTypes: string[]
    ) => Promise<SavedObjectsClientContract>;
  };
}

export class CasesConnector extends SubActionConnector<
  CasesConnectorConfig,
  CasesConnectorSecrets
> {
  private readonly casesService: CasesService;
  private readonly retryService: CasesConnectorRetryService;
  private readonly casesParams: CasesConnectorParams['casesParams'];

  constructor({ connectorParams, casesParams }: CasesConnectorParams) {
    super(connectorParams);

    this.casesService = new CasesService();

    /**
     * We should wait at least 5ms before retrying and no more that 2sec
     */
    const backOffFactory = fullJitterBackoffFactory({ baseDelay: 5, maxBackoffTime: 2000 });
    this.retryService = new CasesConnectorRetryService(this.logger, backOffFactory);

    this.casesParams = casesParams;

    this.registerSubActions();
  }

  private registerSubActions() {
    this.registerSubAction({
      name: CASES_CONNECTOR_SUB_ACTION.RUN,
      method: 'run',
      schema: ZCasesConnectorRunParamsSchema,
    });
  }

  /**
   * Method is not needed for the Case Connector.
   * The function throws an error as a reminder to
   * implement it if we need it in the future.
   */
  protected getResponseErrorMessage(): string {
    throw new Error('Method not implemented.');
  }

  public async run(params: CasesConnectorRunParams) {
    if (!this.kibanaRequest) {
      const error = new CasesConnectorError('Kibana request is not defined', 400);
      this.handleError(error);
    }

    if (params.alerts.length === 0) {
      this.logDebugCurrentState(
        'start',
        '[CasesConnector][_run] No alerts. Skipping execution.',
        params
      );

      return;
    }

    await this.retryService.retryWithBackoff(() => this._run(params));
  }

  private async _run(params: CasesConnectorRunParams) {
    try {
      /**
       * The case connector will throw an error if the Kibana request
       * is not define before executing the _run method
       */
      const kibanaRequest = this.kibanaRequest as KibanaRequest;
      const casesClient = await this.casesParams.getCasesClient(kibanaRequest);
      const savedObjectsClient = await this.casesParams.getUnsecuredSavedObjectsClient(
        kibanaRequest,
        [...getSavedObjectsTypes(), CASE_RULES_SAVED_OBJECT]
      );

      const spaceId = this.casesParams.getSpaceId(kibanaRequest);

      const casesOracleService = new CasesOracleService({
        logger: this.logger,
        savedObjectsClient,
      });

      const connectorExecutor = new CasesConnectorExecutor({
        logger: this.logger,
        casesOracleService,
        casesService: this.casesService,
        casesClient,
        spaceId,
      });

      this.logDebugCurrentState('start', '[CasesConnector][_run] Executing case connector', params);

      await connectorExecutor.execute(params);

      this.logDebugCurrentState(
        'success',
        '[CasesConnector][_run] Execution of case connector succeeded',
        params
      );
    } catch (error) {
      this.handleError(error);
    } finally {
      this.logDebugCurrentState(
        'end',
        '[CasesConnector][_run] Execution of case connector ended',
        params
      );
    }
  }

  private handleError(error: Error) {
    if (isCasesConnectorError(error)) {
      const userError = createTaskUserError(error);
      this.logError(userError);
      throw userError;
    }

    if (isCasesClientError(error)) {
      const caseConnectorError = new CasesConnectorError(
        error.message,
        error.boomify().output.statusCode
      );

      const userError = createTaskUserError(caseConnectorError);
      this.logError(userError);
      throw userError;
    }

    if (Boom.isBoom(error)) {
      const caseConnectorError = new CasesConnectorError(
        `${error.output.payload.error}: ${error.output.payload.message}`,
        error.output.statusCode
      );

      const userError = createTaskUserError(caseConnectorError);
      this.logError(userError);

      throw userError;
    }

    const caseConnectorError = new CasesConnectorError(error.message, 500);
    this.logError(caseConnectorError);

    throw caseConnectorError;
  }

  private logDebugCurrentState(state: string, message: string, params: CasesConnectorRunParams) {
    const alertIds = params.alerts.map(({ _id }) => _id);

    this.logger.debug(`[CasesConnector][_run] ${message}`, {
      labels: {
        ruleId: params.rule.id,
        groupingBy: params.groupingBy,
        totalAlerts: params.alerts.length,
        timeWindow: params.timeWindow,
        reopenClosedCases: params.reopenClosedCases,
        owner: params.owner,
      },
      tags: [`cases-connector:${state}`, params.rule.id, ...alertIds],
    });
  }

  private logError(error: CasesConnectorError) {
    this.logger.error(
      `[CasesConnector][run] Execution of case connector failed. Message: ${error.message}. Status code: ${error.statusCode}`,
      {
        error: {
          stack_trace: error.stack,
          code: error.statusCode.toString(),
          type: 'CasesConnectorError',
        },
      }
    );
  }
}
