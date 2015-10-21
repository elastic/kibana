define(function (require) {
  var _ = require('lodash');
  var $ = require('jquery');

  require('ui/debounce');

  require('ui/modules')
    .get('kibana')
    .directive('validateQuery', function (es, $compile, timefilter, kbnIndex, debounce, Promise, Private) {
      var fromUser = Private(require('ui/validate_query/lib/from_user'));
      var toUser = require('ui/validate_query/lib/to_user');

      return {
        restrict: 'A',
        require: 'ngModel',
        scope: {
          'ngModel': '=',
          'queryInput': '=?',
        },
        link: function ($scope, elem, attr, ngModel) {

          // track request so we can abort it if needed
          var request = {};

          var errorElem = $('<i tooltip={{tooltipMsg}} class="fa fa-ban input-error"></i>').hide();
          $compile(errorElem)($scope);

          var init = function () {
            elem.after(errorElem);
            $scope.ngModel = fromUser($scope.ngModel);
            validator($scope.ngModel);
          };

          function validator(query) {
            if (request.abort) request.abort();

            var prepare = $scope.queryInput ? useSearchSource : useDefaults;

            request = prepare().then(sendRequest);

            function useSearchSource() {
              var pattern = $scope.queryInput.get('index');

              if (_.isString(pattern)) {
                return Promise.resolve({ index: pattern });
              } else if (_.isFunction(_.get(pattern, 'toIndexList'))) {
                return pattern.toIndexList().then(function (indexList) {
                  return { index: indexList };
                });
              } else {
                return useDefaults();
              }
            }

            function useDefaults() {
              return Promise.resolve({
                index: kbnIndex,
                type: '__kibanaQueryValidator'
              });
            }

            function sendRequest(config) {
              return es.indices.validateQuery({
                index: config.index,
                type: config.type,
                explain: true,
                ignoreUnavailable: true,
                body: {
                  query: query || { match_all: {} }
                }
              })
              .then(success, error);
            }

            function error(resp) {
              var msg;

              ngModel.$setValidity('queryInput', false);

              if (resp.explanations && resp.explanations[0]) {
                msg = resp.explanations[0].error;
              } else {
                msg = resp.body.error;
              }

              $scope.tooltipMsg = msg;
              errorElem.show();

              return undefined;
            }

            function success(resp) {
              if (resp.valid) {
                ngModel.$setValidity('queryInput', true);
                errorElem.hide();
                return query;
              } else {
                return error(resp);
              }
            }
          }

          var debouncedValidator = debounce(validator, 300, {
            leading: true,
            trailing: true
          });

          ngModel.$parsers.push(fromUser);
          ngModel.$formatters.push(toUser);

          // Use a model watch instead of parser/formatter. Parsers require the
          // user to actually enter input, which may not happen if the back button is clicked
          $scope.$watch('ngModel', function (newValue, oldValue) {
            if (newValue === oldValue) return;
            debouncedValidator(newValue);
          });

          init();
        }
      };
    });
});
