import type { Logger } from '@kbn/logging';
import type { SecurityLicense } from '@kbn/security-plugin-types-common';
import type { ConfigType } from '../config';
export interface FipsServiceSetupParams {
    config: ConfigType;
    license: SecurityLicense;
}
export interface FipsServiceSetupInternal {
    validateLicenseForFips: () => void;
}
export declare class FipsService {
    private readonly logger;
    private isInitialLicenseLoaded;
    constructor(logger: Logger);
    setup({ config, license }: FipsServiceSetupParams): FipsServiceSetupInternal;
    private validateLicenseForFips;
}
