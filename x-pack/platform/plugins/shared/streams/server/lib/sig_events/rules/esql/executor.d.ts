import type { AlertInstanceContext, AlertInstanceState, RuleExecutorOptions } from '@kbn/alerting-plugin/server';
import type { Alert } from '@kbn/alerts-as-data-utils';
import type { PersistenceServices } from '@kbn/rule-registry-plugin/server';
import type { EsqlRuleInstanceState, EsqlRuleParams } from './types';
export declare function getRuleExecutor(options: RuleExecutorOptions<EsqlRuleParams, EsqlRuleInstanceState, AlertInstanceState, AlertInstanceContext, 'default', Alert> & {
    services: PersistenceServices;
}): Promise<{
    state: {
        previousOriginalDocumentIds: string[];
    };
}>;
