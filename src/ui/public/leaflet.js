require('../../../node_modules/leaflet/dist/leaflet.css');
const Leaflet = require('../../../node_modules/leaflet/dist/leaflet');

require('../../../node_modules/leaflet.heat/dist/leaflet-heat.js');

require('../../../node_modules/leaflet-draw/dist/leaflet.draw.css');
require('../../../node_modules/leaflet-draw/dist/leaflet.draw.js');

require('../../../node_modules/leaflet-responsive-popup/leaflet.responsive.popup.css');
require('../../../node_modules/leaflet-responsive-popup/leaflet.responsive.popup.js');

window.L = Leaflet;
window.L.Browser.touch = false;
window.L.Browser.pointer = false;

module.exports = Leaflet;
