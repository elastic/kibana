import _ from 'lodash';
import $ from 'jquery';
import 'ui/render_directive';
import RegistryNavbarExtensionsProvider from 'ui/registry/navbar_extensions';
import uiModules from 'ui/modules';
const navbar = uiModules.get('kibana/navbar');


navbar.directive('navbar', function (Private, $compile) {
  const navbarExtensions = Private(RegistryNavbarExtensionsProvider);
  const getExtensions = _.memoize(function (name) {
    if (!name) throw new Error('navbar directive requires a name attribute');
    return _.sortBy(navbarExtensions.byAppName[name], 'order');
  });

  return {
    restrict: 'E',
    template: function ($el, $attrs) {
      const $buttonGroup = $el.children('.button-group');
      if ($buttonGroup.length !== 1) throw new Error('navbar must have exactly 1 button group');

      const extensions = getExtensions($attrs.name);
      const buttons = $buttonGroup.children().detach().toArray();
      const controls = [
        ...buttons.map(function (button) {
          return {
            order: 0,
            $el: $(button),
          };
        }),
        ...extensions.map(function (extension, i) {
          return {
            order: extension.order,
            index: i,
            extension: extension,
          };
        }),
      ];

      _.sortBy(controls, 'order').forEach(function (control) {
        if (control.$el) {
          return $buttonGroup.append(control.$el);
        }

        const { extension, index } = control;
        const $ext = $(`<render-directive definition="navbar.extensions[${index}]"></render-directive>`);
        $ext.html(extension.template);
        $buttonGroup.append($ext);
      });

      return $el.html();
    },
    controllerAs: 'navbar',
    controller: function ($attrs) {
      this.extensions = getExtensions($attrs.name);
    }
  };
});
