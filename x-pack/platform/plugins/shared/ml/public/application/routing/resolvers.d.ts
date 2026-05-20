import type { MlApi } from '../services/ml_api_service';
export interface Resolvers {
    [name: string]: (mlApi: MlApi) => Promise<any>;
}
export type ResolverResults = {
    [name: string]: any;
} | undefined;
export declare const basicResolvers: () => Resolvers;
export declare const initSavedObjects: (mlApi: MlApi) => Promise<void | import("@kbn/ml-common-types/saved_objects").InitializeSavedObjectResponse>;
