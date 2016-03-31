import _ from 'lodash';
import $ from 'jquery';
import 'ui/render_directive';
import RegistryNavbarExtensionsProvider from 'ui/registry/navbar_extensions';
import uiModules from 'ui/modules';
const navbar = uiModules.get('kibana/navbar');


navbar.directive('navbarExtensions', function (Private, $compile) {
  const navbarExtensions = Private(RegistryNavbarExtensionsProvider);
  const getExtensions = _.memoize(function (name) {
    if (!name) throw new Error('navbar directive requires a name attribute');
    return _.sortBy(navbarExtensions.byAppName[name], 'order');
  });

  return {
    restrict: 'E',
    template: function ($el, $attrs) {
      const extensions = getExtensions($attrs.name);
      const controls = extensions.map(function (extension, i) {
        return {
          order: extension.order,
          index: i,
          extension: extension,
        };
      });

      _.sortBy(controls, 'order').forEach(function (control) {
        const { extension, index } = control;
        const $ext = $(`<render-directive definition="navbar.extensions[${index}]"></render-directive>`);
        $ext.html(extension.template);
        $el.append($ext);
      });

      return $el.html();
    },
    controllerAs: 'navbar',
    controller: function ($attrs) {
      this.extensions = getExtensions($attrs.name);
    }
  };
});
