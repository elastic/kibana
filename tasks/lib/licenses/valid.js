const describeInvalidLicenses = getInvalid => pkg => (
  `
  ${pkg.name}
    version: ${pkg.version}
    all licenses: ${pkg.licenses}
    invalid licenses: ${getInvalid(pkg.licenses).join(', ')}
    path: ${pkg.relative}
`
);

/**
 *  When given a list of packages and the valid license
 *  options, either throws an error with details about
 *  violations or returns undefined.
 *
 *  @param  {Object} [options={}]
 *  @property {Array<Package>} options.packages List of packages to check, see
 *                                              getInstalledPackages() in ../packages
 *  @property {Array<string>} options.validLicenses
 *  @return {undefined}
 */
export function assertLicensesValid(options = {}) {
  const {
    packages,
    validLicenses
  } = options;

  if (!packages || !validLicenses) {
    throw new Error('packages and validLicenses options are required');
  }

  const getInvalid = licenses => (
    licenses.filter(license => !validLicenses.includes(license))
  );

  // If a package is not located in `node_modules`, we know it's a package from
  // within the Kibana repo. The reason we need to exclude these when checking
  // for valid licenses , is that our `license-checker` dependency marks all
  // packages that have `private: true` in their `package.json` as "UNLICENSED".
  const isInternalPackage = pkg => (
    !pkg.relative.includes('node_modules/')
  );

  const isPackageInvalid = pkg => (
    !pkg.licenses.length || getInvalid(pkg.licenses).length > 0
  );

  const invalidMsgs = packages
    .filter(pkg => !isInternalPackage(pkg))
    .filter(isPackageInvalid)
    .map(describeInvalidLicenses(getInvalid));

  if (invalidMsgs.length) {
    throw new Error(`Non-conforming licenses: ${invalidMsgs.join('')}`);
  }
}
