import type { HttpStart } from '@kbn/core-http-browser';
export interface UnsnoozeAlertInstanceParams {
    id: string;
    instanceId: string;
    http: HttpStart;
}
export declare const unsnoozeAlertInstance: ({ id, instanceId, http }: UnsnoozeAlertInstanceParams) => Promise<void>;
