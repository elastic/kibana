const moment = require('../../../node_modules/moment-timezone/moment-timezone');
const TZ_CONFIG = require('../../../node_modules/moment-timezone/data/packed/latest.json');

moment.tz.load(TZ_CONFIG);
module.exports = moment;
