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
    getEsClientScoped: (request: KibanaRequest) => Promise<ElasticsearchClient>;
    getAlertingAuthorization: (request: KibanaRequest) => Promise<PublicMethodsOf<AlertingAuthorization>>;
    securityPluginSetup: SecurityPluginSetup | undefined;
    ruleDataService: IRuleDataService | null;
    getRuleType: RuleTypeRegistry['get'];
    getRuleList: RuleTypeRegistry['list'];
    getAlertIndicesAlias: AlertingServerStart['getAlertIndicesAlias'];
}
export declare class AlertsClientFactory {
    private isInitialized;
    private logger;
    private esClient;
    private getEsClientScoped;
    private getAlertingAuthorization;
    private securityPluginSetup;
    private ruleDataService;
    private getRuleType;
    private getRuleList;
    private getAlertIndicesAlias;
    initialize(options: AlertsClientFactoryProps): void;
    create(request: KibanaRequest): Promise<AlertsClient>;
}
