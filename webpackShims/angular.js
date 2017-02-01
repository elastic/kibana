require('jquery');
require('node_modules/angular/angular');
require('node_modules/angular-translate/dist/angular-translate.min');
module.exports = window.angular;

require('node_modules/angular-elastic/elastic');

require('ui/modules').get('kibana', ['monospaced.elastic', 'pascalprecht.translate']);
