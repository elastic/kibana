import type { HttpSetup } from '@kbn/core-http-browser';
import type { KibanaServerError } from '@kbn/kibana-utils-plugin/common';
import type { IToasts } from '@kbn/core/public';
import type { InferenceProvider } from '../..';
export declare const getProviders: (http: HttpSetup) => Promise<InferenceProvider[]>;
export declare const useProviders: (http: HttpSetup, toasts: IToasts) => import("@kbn/react-query").UseQueryResult<InferenceProvider[], {
    body: KibanaServerError;
}>;
