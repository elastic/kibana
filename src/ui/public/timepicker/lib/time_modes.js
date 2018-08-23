
const ISO8601_FORMAT = 'YYYY-MM-DDTHH:mm:ss.SSS';

export const TIME_MODES = {
  ABSOLUTE: 'absolute',
  RELATIVE: 'relative',
  NOW: 'now',
};

export function getTimeMode(value) {
  if (value === 'now') {
    return TIME_MODES.NOW;
  }

  if (value.includes('now')) {
    return TIME_MODES.RELATIVE;
  }

  return TIME_MODES.absolute;
}
