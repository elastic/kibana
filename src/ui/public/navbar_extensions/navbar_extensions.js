const _ = require('lodash');
const $ = require('jquery');
const navbar = require('ui/modules').get('kibana');

navbar.directive('navbarExtensions', function (Private, $compile) {
  const navbarExtensionsRegistry = Private(require('ui/registry/navbar_extensions'));
  const getExtensions = _.memoize(function (name) {
    if (!name) throw new Error('navbar directive requires a name attribute');
    return _.sortBy(navbarExtensionsRegistry.byAppName[name], 'order');
  });

  return {
    scope: {
      configTemplate: '='
    },
    restrict: 'E',
    link: function ($scope, $el, $attr) {
      if (!$scope.configTemplate) throw new Error('navbar extensions require a configTemplate');

      const extensions = getExtensions($attr.name);

      extensions.forEach(function (extension) {
        $scope.configTemplate.push(extension.name, extension.template);

        const extScope = $scope.$new();
        const $ext = $(`
          <kbn-tooltip text="${extension.description}" placement="bottom" append-to-body="1">
            <button
              aria-label="${extension.description}"
              aria-haspopup="true"
              ng-click="configTemplate.toggle('${extension.name}')">
              <i aria-hidden="true" class="fa ${extension.icon}"></i>
            </button>
          </kbn-tooltip>
        `);
        const $ctrl = $compile($ext)(extScope);
        $el.append($ctrl);
      });
    },
    controllerAs: 'navbarExtensions',
    controller: function ($attrs) {
      this.extensions = getExtensions($attrs.name);
    }
  };
});
