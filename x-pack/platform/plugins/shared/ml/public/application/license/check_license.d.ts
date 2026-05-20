import type { MlLicense } from '../../../common/license';
/**
 * Cache ml license to support legacy usage.
 */
export declare function setLicenseCache(mlLicenseInstance: MlLicense): MlLicense;
/**
 * Check to see if the current license has expired
 *
 * @deprecated
 * @export
 * @returns {boolean}
 */
export declare function hasLicenseExpired(): boolean;
/**
 * Check to see if the current license is trial, platinum or enterprise.
 *
 * @deprecated
 * @export
 * @returns {boolean}
 */
export declare function isFullLicense(): boolean;
/**
 * Check to see if the current license is trial.
 * Note, this is not accurate for cloud trials.
 * For cloud trials use isCloudTrial returned from the mlInfo endpoint
 *
 * @deprecated
 * @export
 * @returns {boolean}
 */
export declare function isTrialLicense(): boolean;
