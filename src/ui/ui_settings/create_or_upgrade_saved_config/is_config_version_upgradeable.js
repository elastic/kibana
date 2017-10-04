import semver from 'semver';
const rcVersionRegex = /^(\d+\.\d+\.\d+)\-rc(\d+)$/i;

function extractRcNumber(version) {
  const match = version.match(rcVersionRegex);
  return match
    ? [match[1], parseInt(match[2], 10)]
    : [version, Infinity];
}

export function isConfigVersionUpgradeable(savedVersion, kibanaVersion) {
  if (
    typeof savedVersion !== 'string' ||
    typeof kibanaVersion !== 'string' ||
    savedVersion === kibanaVersion ||
    /alpha|beta|snapshot/i.test(savedVersion)
  ) {
    return false;
  }

  const [savedReleaseVersion, savedRcNumber] = extractRcNumber(savedVersion);
  const [kibanaReleaseVersion, kibanaRcNumber] = extractRcNumber(kibanaVersion);

  // ensure that both release versions are valid, if not then abort
  if (!semver.valid(savedReleaseVersion) || !semver.valid(kibanaReleaseVersion)) {
    return false;
  }

  // ultimately if the saved config is from a previous kibana version
  // or from an earlier rc of the same version, then we can upgrade
  const savedIsLessThanKibana = semver.lt(savedReleaseVersion, kibanaReleaseVersion);
  const savedIsSameAsKibana = semver.eq(savedReleaseVersion, kibanaReleaseVersion);
  const savedRcIsLessThanKibana = savedRcNumber < kibanaRcNumber;
  return savedIsLessThanKibana || (savedIsSameAsKibana && savedRcIsLessThanKibana);
}
