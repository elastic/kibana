import { forOwn, noop } from 'lodash';

import 'ui/bind';

const bindingRE = /^(=|=\?|&|@)([a-zA-Z0-9_$]+)?$/;

export default function ($parse) {
  return function (bindings, $scope, $attrs) {
    forOwn(bindings, (binding, local) => {
      if (!bindingRE.test(binding)) {
        throw new Error(`Invalid scope binding "${binding}". Expected it to match ${bindingRE}`);
      }

      const [, type, attribute = local] = binding.match(bindingRE);
      const attr = $attrs[attribute];
      switch (type) {
        case '=':
          $scope.$bind(local, attr);
          break;
        case '=?':
          throw new Error('<render-directive> does not currently support optional two-way bindings.');
          break;
        case '&':
          if (attr) {
            const getter = $parse(attr);
            $scope[local] = function () {
              return getter($scope.$parent);
            };
          } else {
            $scope[local] = noop;
          }
          break;
        case '@':
          $scope[local] = attr;
          $attrs.$observe(attribute, v => $scope[local] = v);
          break;
      }
    });
  };
}
