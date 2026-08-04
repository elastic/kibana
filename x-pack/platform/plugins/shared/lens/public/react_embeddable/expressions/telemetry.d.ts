import type { KibanaExecutionContext } from '@kbn/core/public';
export declare function getLogError(getExecutionContext: () => KibanaExecutionContext | undefined): (type: "runtime" | "validation") => void;
