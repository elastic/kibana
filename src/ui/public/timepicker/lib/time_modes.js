import moment from 'moment';

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

  try {
    moment(value, ISO8601_FORMAT);
    return TIME_MODES.absolute;
  } catch (err) {
    throw new Error(`Unknown mode, unable to parse ${value} with format ${ISO8601_FORMAT}.`);
  }
}

export function toMoment(value) {
  if (!value) {
    return moment();
  }

  const mode = getTimeMode(value);
  switch(mode) {
    case TIME_MODES.NOW:
      return moment();
    case TIME_MODES.RELATIVE:
      return moment();
    case TIME_MODES.ABSOLUTE:
      return moment(value, ISO8601_FORMAT);
  }
}
