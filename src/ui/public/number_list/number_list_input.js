define(function (require) {
  let $ = require('jquery');
  let _ = require('lodash');
  let keyMap = require('ui/utils/key_map');

  let INVALID = {}; // invalid flag
  let FLOATABLE = /^[\d\.e\-\+]+$/i;

  let VALIDATION_ERROR = 'numberListRangeAndOrder';
  let DIRECTIVE_ATTR = 'kbn-number-list-input';

  require('ui/modules')
  .get('kibana')
  .directive('kbnNumberListInput', function ($parse) {
    return {
      restrict: 'A',
      require: ['ngModel', '^kbnNumberList'],
      link: function ($scope, $el, attrs, controllers) {
        let ngModelCntr = controllers[0];
        let numberListCntr = controllers[1];

        let $setModel = $parse(attrs.ngModel).assign;
        let $repeater = $el.closest('[ng-repeat]');

        let handlers = {
          up: change(add, 1),
          'shift-up': change(addTenth, 1),

          down: change(add, -1),
          'shift-down': change(addTenth, -1),

          tab: go('next'),
          'shift-tab': go('prev'),

          'shift-enter': numberListCntr.add,

          backspace: removeIfEmpty,
          delete: removeIfEmpty
        };

        function removeIfEmpty(event) {
          if (!ngModelCntr.$viewValue) {
            $get('prev').focus();
            numberListCntr.remove($scope.$index);
            event.preventDefault();
          }

          return false;
        }

        function $get(dir) {
          return $repeater[dir]().find('[' + DIRECTIVE_ATTR + ']');
        }

        function go(dir) {
          return function () {
            let $to = $get(dir);
            if ($to.size()) $to.focus();
            else return false;
          };
        }

        function idKey(event) {
          let id = [];
          if (event.ctrlKey) id.push('ctrl');
          if (event.shiftKey) id.push('shift');
          if (event.metaKey) id.push('meta');
          if (event.altKey) id.push('alt');
          id.push(keyMap[event.keyCode] || event.keyCode);
          return id.join('-');
        }

        function add(n, val) {
          return parse(val + n);
        }

        function addTenth(n, val, str) {
          let int = Math.floor(val);
          let dec = parseInt(str.split('.')[1] || 0, 10);
          dec = dec + parseInt(n, 10);

          if (dec < 0 || dec > 9) {
            int += Math.floor(dec / 10);
            if (dec < 0) {
              dec = 10 + (dec % 10);
            } else {
              dec = dec % 10;
            }
          }

          return parse(int + '.' + dec);
        }

        function change(using, mod) {
          return function () {
            let str = String(ngModelCntr.$viewValue);
            let val = parse(str);
            if (val === INVALID) return;

            let next = using(mod, val, str);
            if (next === INVALID) return;

            $el.val(next);
            ngModelCntr.$setViewValue(next);
          };
        }

        function onKeydown(event) {
          let handler = handlers[idKey(event)];
          if (!handler) return;

          if (handler(event) !== false) {
            event.preventDefault();
          }

          $scope.$apply();
        }

        $el.on('keydown', onKeydown);
        $scope.$on('$destroy', function () {
          $el.off('keydown', onKeydown);
        });

        function parse(viewValue) {
          let num = viewValue;

          if (typeof num !== 'number' || isNaN(num)) {
            // parse non-numbers
            num = String(viewValue || 0).trim();
            if (!FLOATABLE.test(num)) return INVALID;

            num = parseFloat(num);
            if (isNaN(num)) return INVALID;
          }

          let range = numberListCntr.range;
          if (!range.within(num)) return INVALID;

          if ($scope.$index > 0) {
            let i = $scope.$index - 1;
            let list = numberListCntr.getList();
            let prev = list[i];
            if (num <= prev) return INVALID;
          }

          return num;
        }

        $scope.$watchMulti([
          '$index',
          {
            fn: $scope.$watchCollection,
            get: function () {
              return numberListCntr.getList();
            }
          }
        ], function () {
          let valid = parse(ngModelCntr.$viewValue) !== INVALID;
          ngModelCntr.$setValidity(VALIDATION_ERROR, valid);
        });

        function validate(then) {
          return function (input) {
            let value = parse(input);
            let valid = value !== INVALID;
            value = valid ? value : input;
            ngModelCntr.$setValidity(VALIDATION_ERROR, valid);
            then && then(input, value);
            return value;
          };
        }

        ngModelCntr.$parsers.push(validate());
        ngModelCntr.$formatters.push(validate(function (input, value) {
          if (input !== value) $setModel($scope, value);
        }));

        if (parse(ngModelCntr.$viewValue) === INVALID) {
          ngModelCntr.$setTouched();
        }
      }
    };
  });

});
