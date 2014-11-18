define(function (require) {
  var module = require('modules').get('test/unit/spec/vislib/pie', ['kibana']);
  require('service/private');

  module.service('pie', function (Private) {
  });
});
