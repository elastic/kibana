import semver from 'semver';

export function versionSatisfies(cleanActual, expectedRange) {
  try {
    return semver.satisfies(cleanActual, expectedRange);
  } catch (err) {
    return false;
  }
}
