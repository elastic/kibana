import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';
export declare const getUsageCollectionStart: import("@kbn/kibana-utils-plugin/public").Get<UsageCollectionStart>, setUsageCollectionStart: import("@kbn/kibana-utils-plugin/public").Set<UsageCollectionStart>;
/** @internal **/
export declare const trackSaveUiCounterEvents: (events: string | string[], context?: KibanaExecutionContext) => void;
/** @internal **/
export declare const trackUiCounterEvents: (events: string | string[], context?: KibanaExecutionContext, eventPrefix?: string) => void;
/** @internal **/
export declare const getExecutionContextEvents: (context?: KibanaExecutionContext) => string[];
