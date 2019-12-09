/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RawLicense } from '../../../../../plugins/licensing/server';

/**
 * "View" for XPack Info license information.
 */
export class XPackInfoLicense {
  /**
   * Function that retrieves license information from the XPack info object.
   * @type {Function}
   * @private
   */
  _getRawLicense: () => RawLicense | undefined;

  constructor(getRawLicense: () => RawLicense | undefined) {
    this._getRawLicense = getRawLicense;
  }

  /**
   * Returns unique identifier of the license.
   * @returns {string|undefined}
   */
  getUid() {
    return this._getRawLicense()?.uid;
  }

  /**
   * Indicates whether license is still active.
   * @returns {boolean}
   */
  isActive() {
    return this._getRawLicense()?.status === 'active';
  }

  /**
   * Returns license expiration date in ms.
   *
   * Note: A basic license created after 6.3 will have no expiration, thus returning undefined.
   *
   * @returns {number|undefined}
   */
  getExpiryDateInMillis() {
    return this._getRawLicense()?.expiry_date_in_millis;
  }

  /**
   * Checks if the license is represented in a specified license list.
   * @param {String} candidateLicenses List of the licenses to check against.
   * @returns {boolean}
   */
  isOneOf(candidateLicenses: string | string[]) {
    const candidate = Array.isArray(candidateLicenses) ? candidateLicenses : [candidateLicenses];
    const mode = this._getRawLicense()?.mode;
    return Boolean(mode && candidate.includes(mode));
  }

  /**
   * Returns type of the license (basic, gold etc.).
   * @returns {string|undefined}
   */
  getType() {
    return this._getRawLicense()?.type;
  }

  /**
   * Returns mode of the license (basic, gold etc.). This is the "effective" type of the license.
   * @returns {string|undefined}
   */
  getMode() {
    return this._getRawLicense()?.mode;
  }

  /**
   * Determine if the current license is active and the supplied {@code type}.
   *
   * @param {Function} typeChecker The license type checker.
   * @returns {boolean}
   */
  isActiveLicense(typeChecker: (mode: string) => boolean) {
    const license = this._getRawLicense();

    return license?.status === 'active' && typeChecker(license?.mode);
  }

  /**
   * Determine if the license is an active, basic license.
   *
   * Note: This also verifies that the license is active. Therefore it is not safe to assume that !isBasic() === isNotBasic().
   *
   * @returns {boolean}
   */
  isBasic() {
    return this.isActiveLicense(mode => mode === 'basic');
  }

  /**
   * Determine if the license is an active, non-basic license (e.g., standard, gold, platinum, or trial).
   *
   * Note: This also verifies that the license is active. Therefore it is not safe to assume that !isBasic() === isNotBasic().
   *
   * @returns {boolean}
   */
  isNotBasic() {
    return this.isActiveLicense(mode => mode !== 'basic');
  }
}
