import type { NoDataStrategy } from '@kbn/alerting-v2-schemas';
import { type Query, type RecoveryStrategy } from '@kbn/alerting-v2-schemas';
import type { RuleApiResponse } from '../../services/rules_api';
export declare const EMPTY_VALUE = "-";
export declare function formatAlertDelay(stateTransition: RuleApiResponse['state_transition']): string;
export declare function formatRecoveryDelay(stateTransition: RuleApiResponse['state_transition']): string;
export declare function formatNoDataStrategy(strategy?: NoDataStrategy | null): string;
export declare function getRecoverEsqlSegment(query: Query, strategy?: RecoveryStrategy): string | undefined;
export declare function formatRecoveryStrategy(strategy?: RecoveryStrategy | null): string;
