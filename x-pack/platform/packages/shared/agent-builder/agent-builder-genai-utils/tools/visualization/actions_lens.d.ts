import type { VisualizationConfig } from './types';
export interface GenerateEsqlAction {
    type: 'generate_esql';
    success: boolean;
    query?: string;
    error?: string;
}
export interface GenerateConfigAction {
    type: 'generate_config';
    success: boolean;
    config?: any;
    attempt: number;
    error?: string;
}
export interface ValidateConfigAction {
    type: 'validate_config';
    success: boolean;
    config?: VisualizationConfig;
    attempt: number;
    error?: string;
}
export interface GenerateTimeRangeAction {
    type: 'generate_time_range';
    success: boolean;
    timeRange?: {
        from: string;
        to: string;
    };
    error?: string;
}
export type Action = GenerateEsqlAction | GenerateConfigAction | ValidateConfigAction | GenerateTimeRangeAction;
export declare function isGenerateConfigAction(action: Action): action is GenerateConfigAction;
export declare function isValidateConfigAction(action: Action): action is ValidateConfigAction;
export declare function isGenerateTimeRangeAction(action: Action): action is GenerateTimeRangeAction;
export declare const GENERATE_ESQL_NODE = "generate_esql_query";
export declare const GENERATE_CONFIG_NODE = "generate_config";
export declare const VALIDATE_CONFIG_NODE = "validate_config";
export declare const GENERATE_TIME_RANGE_NODE = "generate_time_range";
export declare const MAX_RETRY_ATTEMPTS = 5;
