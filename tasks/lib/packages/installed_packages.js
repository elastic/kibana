import { relative } from 'path';

import { callLicenseChecker } from './license_checker';

/**
 *  Get a list of objects with details about each installed
 *  NPM package.
 *
 *  @param  {Object} [options={}]
 *  @property {String} options.directory root of the project to read
 *  @property {Boolean} [options.dev=false] should development dependencies be included?
 *  @property {Object} [options.licenseOverrides] map of `${name}@${version}` to a list of
 *                                                license ids to override the automatically
 *                                                detected ones
 *  @return {Array<Object>}
 */
export async function getInstalledPackages(options = {}) {
  const {
    directory,
    dev = false,
    licenseOverrides = {}
  } = options;

  if (!directory) {
    throw new Error('You must specify a directory to read installed packages from');
  }

  const licenseInfo = await callLicenseChecker({ directory, dev });
  return Object
    .keys(licenseInfo)
    .map(key => {
      const keyParts = key.split('@');
      const name = keyParts.slice(0, -1).join('@');
      const version = keyParts[keyParts.length - 1];
      const {
        licenses: detectedLicenses,
        realPath,
      } = licenseInfo[key];

      const licenses = [].concat(
        licenseOverrides[key]
          ? licenseOverrides[key]
          : detectedLicenses
      );

      return {
        name,
        version,
        licenses,
        directory: realPath,
        relative: relative(directory, realPath)
      };
    })
    .filter(pkg => pkg.directory !== directory);
}
