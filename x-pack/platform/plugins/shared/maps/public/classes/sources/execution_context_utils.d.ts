import type { KibanaExecutionContext } from '@kbn/core/public';
export declare function mergeExecutionContext(mergeContext: Partial<KibanaExecutionContext>, context?: KibanaExecutionContext): KibanaExecutionContext;
export declare function getExecutionContextId(context?: KibanaExecutionContext): string | undefined;
