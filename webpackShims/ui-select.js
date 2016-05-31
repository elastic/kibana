require('jquery');
require('angular');
require('angular-sanitize');
require('node_modules/ui-select/dist/select');
require('node_modules/ui-select/dist/select.css');

require('ui/modules').get('kibana', ['ui.select', 'ngSanitize']);
