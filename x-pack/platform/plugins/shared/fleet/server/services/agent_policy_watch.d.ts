import type { Logger } from '@kbn/core/server';
import type { ILicense } from '@kbn/licensing-types';
import type { LicenseService } from '../../common/services/license';
export declare class PolicyWatcher {
    private logger;
    private subscription;
    constructor(logger: Logger);
    start(licenseService: LicenseService): void;
    stop(): void;
    watch(license: ILicense): Promise<void>;
}
