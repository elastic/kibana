import type { ILicense } from '@kbn/licensing-types';
/**
 * Check if 2 potential license instances have changes between them
 * @internal
 */
export declare function hasLicenseInfoChanged(currentLicense: ILicense | undefined, newLicense: ILicense): boolean;
