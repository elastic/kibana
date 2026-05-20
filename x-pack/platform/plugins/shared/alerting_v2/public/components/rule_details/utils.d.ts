import type { RuleApiResponse } from '../../services/rules_api';
export declare const EMPTY_VALUE = "-";
export declare function formatAlertDelay(stateTransition: RuleApiResponse['state_transition']): string;
export declare function formatRecoveryDelay(stateTransition: RuleApiResponse['state_transition']): string;
