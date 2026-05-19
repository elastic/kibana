import { type AiOpsFullIndexBasedAppState } from './common';
export interface LogCategorizationPageUrlState {
    pageKey: 'logCategorization';
    pageUrlState: LogCategorizationAppState;
}
export interface LogCategorizationAppState extends AiOpsFullIndexBasedAppState {
    field: string | undefined;
}
export declare const getDefaultLogCategorizationAppState: (overrides?: Partial<LogCategorizationAppState>) => LogCategorizationAppState;
