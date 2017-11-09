const MomentTimezone = require('../../../node_modules/moment-timezone/moment-timezone');
const TZ_CONFIG = require('../../../node_modules/moment-timezone/data/packed/latest.json');

MomentTimezone.tz.load(TZ_CONFIG);

module.exports = MomentTimezone;
