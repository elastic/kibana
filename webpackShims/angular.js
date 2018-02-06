require('jquery');
require('../node_modules/angular/angular');
module.exports = window.angular;

require('../node_modules/angular-elastic/elastic');

require('ui/modules').get('kibana', ['monospaced.elastic']);
