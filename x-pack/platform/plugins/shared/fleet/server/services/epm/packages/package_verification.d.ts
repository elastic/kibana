import * as openpgp from 'openpgp';
import type { Logger } from '@kbn/logging';
import type { PackageVerificationResult } from '../../../types';
import type { Installation } from '../../../types';
export declare function getGpgKeyIdOrUndefined(): Promise<string | undefined>;
export declare function getGpgKeyOrUndefined(): Promise<openpgp.Key | undefined>;
export declare function _readGpgKey(): Promise<openpgp.Key | undefined>;
export declare function verifyPackageArchiveSignature({ pkgName, pkgVersion, pkgArchiveBuffer, logger, }: {
    pkgName: string;
    pkgVersion: string;
    pkgArchiveBuffer: Buffer | undefined;
    logger: Logger;
}): Promise<PackageVerificationResult>;
type InstallationVerificationKeys = Pick<Installation, 'verification_status' | 'verification_key_id'>;
export declare function formatVerificationResultForSO(verificationResult: PackageVerificationResult): InstallationVerificationKeys;
export {};
