import type { MlPluginStart } from '@kbn/ml-plugin/public';
export interface MlFeatureFlags {
    isPatternsEnabled: boolean;
}
export type MlCapabilities = {
    status: 'available';
} | {
    status: 'unavailable';
    reason: 'disabled' | 'insufficientLicense';
};
export type MlApiDependency = Pick<NonNullable<MlPluginStart['mlApi']>, 'checkMlCapabilities'> | undefined;
export declare const loadMlCapabilitiesActor: ({ mlApi }: {
    mlApi: MlApiDependency;
}) => import("xstate").PromiseActorLogic<MlCapabilities, {
    featureFlags: MlFeatureFlags;
}, import("xstate").EventObject>;
