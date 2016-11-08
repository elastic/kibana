export function versionSatisfies(cleanActual, cleanExpected) {
  try {
    return (cleanActual === cleanExpected);
  } catch (err) {
    return false;
  }
}

export function cleanVersion(version) {
  const match = version.match(/\d+\.\d+\.\d+/);
  if (!match) return version;
  return match[0];
}
