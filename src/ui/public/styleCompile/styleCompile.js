define(function (require) {
  var _ = require('lodash');
  var $ = require('jquery');
  var $style = $('<style>').appendTo('head').attr('id', 'style-compile');

  require('ui/config');

  require('ui/modules')
  .get('kibana')
  .run(function ($rootScope, $compile, config) {
    var truncateGradientHeight = 15;
    var template = _.template(require('./styleCompile.css.tmpl'));
    var locals = {};

    // watch the value of the truncate:maxHeight config param
    $rootScope.$watch(function () {
      return config.get('truncate:maxHeight');
    }, function (maxHeight) {
      if (maxHeight > 0) {
        locals.truncateMaxHeight = maxHeight + 'px !important';
        locals.truncateGradientTop = maxHeight - truncateGradientHeight + 'px';
      } else {
        locals.truncateMaxHeight = 'none';
        locals.truncateGradientTop = '-' + truncateGradientHeight + 'px';
      }

      $style.html(template(locals));
    });
  });
});
