const $ = require('jquery');

if (window) window.jQuery = $;

require('flot-charts/jquery.flot');

// load flot plugins
require('flot-charts/jquery.flot.time');
require('flot-charts/jquery.flot.pie');
require('flot-charts/jquery.flot.stack');

module.exports = $;
