import type { LicenseType, ILicense, LicenseStatus, LicenseCheck, PublicLicenseJSON, PublicLicense, PublicFeatures } from '@kbn/licensing-types';
/**
 * @public
 */
export declare class License implements ILicense {
    private readonly license?;
    private readonly features?;
    readonly error?: string;
    readonly isActive: boolean;
    readonly isAvailable: boolean;
    readonly uid?: string;
    readonly status?: LicenseStatus;
    readonly expiryDateInMillis?: number;
    readonly type?: LicenseType;
    readonly mode?: LicenseType;
    readonly signature: string;
    /**
     * @internal
     * Generate a License instance from json representation.
     */
    static fromJSON(json: PublicLicenseJSON): License;
    constructor({ license, features, error, signature, }: {
        license?: PublicLicense;
        features?: PublicFeatures;
        error?: string;
        signature: string;
    });
    toJSON(): {
        license: PublicLicense | undefined;
        features: PublicFeatures | undefined;
        signature: string;
    };
    getUnavailableReason(): string | undefined;
    hasAtLeast(minimumLicenseRequired: LicenseType): boolean;
    check(pluginName: string, minimumLicenseRequired: LicenseType): LicenseCheck;
    getFeature(id: string): {
        isAvailable: boolean;
        isEnabled: boolean;
    };
}
