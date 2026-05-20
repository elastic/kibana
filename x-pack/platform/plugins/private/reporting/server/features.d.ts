import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
export declare const API_PRIVILEGES: {
    MANAGE_SCHEDULED_REPORTING: string;
};
interface FeatureRegistrationOpts {
    features: FeaturesPluginSetup;
    isServerless: boolean;
}
export declare function registerFeatures({ isServerless, features }: FeatureRegistrationOpts): void;
export {};
