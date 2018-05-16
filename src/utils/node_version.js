import _ from 'lodash';
import { pkg } from './index';
import semver from 'semver';

/**
 * Offers utility methods to deal with node versions
 *
 * @class NodeVersion
 * @static
 */
class NodeVersion {
  /**
   * Get the current NodeJs version used to run this code
   *
   * @returns {?string}
   * @static
   */
  static getCurrentVersion() {
    return semver.valid(
      semver.coerce(
        _.get(process, 'version', null)
      )
    );
  }

  /**
   * Get the required NodeJs version to run this code according
   * the one defined in the package.json file (engines config)
   *
   * @returns {?string}
   * @static
   */
  static getRequiredVersion() {
    return _.get(pkg, 'engines.node', null);
  }

  /**
   * Compares the current NodeJS version and the required one
   * and states if the version requirements are being met.
   *
   * @param {?string} currentVersion The current NodeJS version in use
   * @param {?string} requiredVersion The required NodeJS version defined in package.json.
   *                 It supports the NodeJS range versions notation.
   *
   * @returns {boolean}
   * @static
   */
  static isVersionValid(currentVersion, requiredVersion) {
    return (!!currentVersion
      && !!requiredVersion
      && semver.satisfies(currentVersion, requiredVersion)
    );
  }

  /**
   * Allows to run a validator callback in both valid or invalid validation results.
   *
   * @param {NodeVersion~ValidatorAction} validatorAction Validator callback function
   * @param {boolean} [runActionWhenValid = false] Defines where the callback runs in
   *                                               a valid or invalid validation context.
   * @static
   */
  static runValidator(validatorAction, runActionWhenValid = false) {
    const currentVersion = NodeVersion.getCurrentVersion();
    const requiredVersion = NodeVersion.getRequiredVersion();
    const isVersionValid = NodeVersion.isVersionValid(currentVersion, requiredVersion);

    if (isVersionValid === runActionWhenValid) {
      validatorAction();
    }
  }
  /**
   * A callback function to being used by the runValidator method
   *
   * @callback NodeVersion~ValidatorAction
   */
}

export { NodeVersion };
