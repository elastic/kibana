/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { RuleTypeRegistry } from '@kbn/alerting-plugin/server/types';
import type { AlertingAuthorization, AlertingServerStart } from '@kbn/alerting-plugin/server';
import type { SecurityPluginSetup } from '@kbn/security-plugin/server';
import type { IRuleDataService } from '../rule_data_plugin_service';
import { AlertsClient } from './alerts_client';

export interface AlertsClientFactoryProps {
  logger: Logger;
  esClient: ElasticsearchClient;
  getEsClientScoped?: (request: KibanaRequest) => Promise<ElasticsearchClient>;
  getAlertingAuthorization: (
    request: KibanaRequest
  ) => Promise<PublicMethodsOf<AlertingAuthorization>>;
  securityPluginSetup: SecurityPluginSetup | undefined;
  ruleDataService: IRuleDataService | null;
  getRuleType: RuleTypeRegistry['get'];
  getRuleList: RuleTypeRegistry['list'];
  getAlertIndicesAlias: AlertingServerStart['getAlertIndicesAlias'];
}

export class AlertsClientFactory {
  private isInitialized = false;
  private logger!: Logger;
  private esClient!: ElasticsearchClient;
  private getEsClientScoped?: (request: KibanaRequest) => Promise<ElasticsearchClient>;
  private getAlertingAuthorization!: (
    request: KibanaRequest
  ) => Promise<PublicMethodsOf<AlertingAuthorization>>;
  private securityPluginSetup!: SecurityPluginSetup | undefined;
  private ruleDataService!: IRuleDataService | null;
  private getRuleType!: RuleTypeRegistry['get'];
  private getRuleList!: RuleTypeRegistry['list'];
  private getAlertIndicesAlias!: AlertingServerStart['getAlertIndicesAlias'];

  public initialize(options: AlertsClientFactoryProps) {
    /**
     * This should be called by the plugin's start() method.
     */
    if (this.isInitialized) {
      throw new Error('AlertsClientFactory (RAC) already initialized');
    }

    this.getAlertingAuthorization = options.getAlertingAuthorization;
    this.isInitialized = true;
    this.logger = options.logger;
    this.esClient = options.esClient;
    this.getEsClientScoped = options.getEsClientScoped;
    this.securityPluginSetup = options.securityPluginSetup;
    this.ruleDataService = options.ruleDataService;
    this.getRuleType = options.getRuleType;
    this.getRuleList = options.getRuleList;
    this.getAlertIndicesAlias = options.getAlertIndicesAlias;
  }

  public async create(request: KibanaRequest): Promise<AlertsClient> {
    const { securityPluginSetup, getAlertingAuthorization, logger } = this;
    const authorization = await getAlertingAuthorization(request);

    return new AlertsClient({
      logger,
      authorization,
      auditLogger: securityPluginSetup?.audit.asScoped(request),
      esClient: this.esClient,
      esClientScoped: this.getEsClientScoped ? await this.getEsClientScoped(request) : undefined,
      ruleDataService: this.ruleDataService!,
      getRuleType: this.getRuleType,
      getRuleList: this.getRuleList,
      getAlertIndicesAlias: this.getAlertIndicesAlias,
    });
  }
}
