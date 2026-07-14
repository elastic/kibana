import type { HttpStart } from '@kbn/core/public';
import type { LicenseType } from '@kbn/licensing-types';
/** @public */
export interface FeatureUsageServiceSetup {
    /**
     * Register a feature to be able to notify of it's usages using the {@link FeatureUsageServiceStart | service start contract}.
     */
    register(featureId: string, licenseType: LicenseType): void;
}
/** @public */
export interface FeatureUsageServiceStart {
    /**
     * Notify of a registered feature usage at given time.
     *
     * @param featureId - the identifier of the feature to notify usage of
     * @param usedAt - Either a `Date` or an unix timestamp with ms. If not specified, it will be set to the current time.
     */
    notifyUsage(featureId: string, usedAt?: Date | number): Promise<void>;
}
interface StartDeps {
    http: HttpStart;
}
/**
 * @internal
 */
export declare class FeatureUsageService {
    private readonly registrations;
    setup(): FeatureUsageServiceSetup;
    start({ http }: StartDeps): FeatureUsageServiceStart;
}
export {};
