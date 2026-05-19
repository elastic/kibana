import type { DefaultLogViewsStaticConfig, LogViewAttributes } from './types';
export declare const defaultLogViewId = "default";
export declare const defaultFilterStateKey = "logFilter";
export declare const defaultPositionStateKey = "logPosition";
export declare const DEFAULT_REFRESH_INTERVAL: {
    pause: boolean;
    value: number;
};
export declare const defaultLogViewAttributes: LogViewAttributes;
export declare const defaultLogViewsStaticConfig: DefaultLogViewsStaticConfig;
export declare const DEFAULT_LOG_VIEW: {
    type: "log-view-reference";
    logViewId: string;
};
