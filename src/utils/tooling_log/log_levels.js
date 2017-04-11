
const LEVELS = [
  'silent',
  'error',
  'warning',
  'info',
  'debug',
  'verbose',
];

export function createLogLevelFlags(levelLimit) {
  const levelLimitI = LEVELS.indexOf(levelLimit);

  if (levelLimitI === -1) {
    const msg = (
      `Invalid log level "${levelLimit}" ` +
      `(expected one of ${LEVELS.join(',')})`
    );
    throw new Error(msg);
  }

  const flags = {};
  LEVELS.forEach((level, i) => {
    flags[level] = i <= levelLimitI;
  });
  return flags;
}
