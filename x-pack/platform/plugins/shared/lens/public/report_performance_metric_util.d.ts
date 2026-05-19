import type { Adapters } from '@kbn/inspector-plugin/public';
export interface ILensRequestPerformance {
    requestTimeTotal: number;
    esTookTotal: number;
}
export declare function getSuccessfulRequestTimings(inspectorAdapters: Adapters): ILensRequestPerformance | null;
