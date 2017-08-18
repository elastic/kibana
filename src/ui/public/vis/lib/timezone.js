const tzDetect = require('jstimezonedetect').jstz;
import moment from 'moment';

export function timezoneProvider(config) {
  return function () {

    if (config.isDefault('dateFormat:tz')) {
      const detectedTimezone = tzDetect.determine().name();
      if (detectedTimezone) return detectedTimezone;
      else return moment().format('Z');
    } else {
      return config.get('dateFormat:tz', 'Browser');
    }

  };
}

