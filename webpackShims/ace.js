require('brace');
require('brace/mode/json');
require('../node_modules/@elastic/ui-ace/ui-ace');

require('ui/modules').get('kibana', ['ui.ace']);

module.exports = window.ace;
