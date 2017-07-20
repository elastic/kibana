
const LEVELS = [
  'silent',
  'error',
  'warning',
  'info',
  'debug',
  'verbose',
];

export function parseLogLevel(name) {
  const i = LEVELS.indexOf(name);

  if (i === -1) {
    const msg = (
      `Invalid log level "${name}" ` +
      `(expected one of ${LEVELS.join(',')})`
    );
    throw new Error(msg);
  }

  const flags = {};
  LEVELS.forEach((level, levelI) => {
    flags[level] = levelI <= i;
  });

  return { name, flags };
}
