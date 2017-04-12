import moment from 'moment';

//Force weekdays to always have Sunday as index 0, regardless of the local first day of the week.
const localeSpecific = false;
const weekdays = moment.weekdaysShort(localeSpecific);
//move sunday from begging of array to end of array
weekdays.push(weekdays.shift());

/*
 * ElasticSearch dayOfWeek lucene expression always returns Monday as the first day of week.
 * Depending on the locale, Moment will return different days as the first day of week.
 * This exports a weekdays array with locale spellings but
 * where Monday is the first day regardless of locale settings.
 */
export const mondayFirstWeekdays = Object.freeze(weekdays);