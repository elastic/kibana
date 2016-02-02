const app = require('ui/modules').get('kibana');

app.directive('dropdownButton', function ($document) {
  return {
    restrict: 'E',
    scope: {
      value: '='
    },
    template: require('ui/share/views/dropdown_button.html'),
    link: function ($scope, $el) {
      $scope.$wrapper = $el;
      $scope.$button = $el.find('.toggle-button')[0];

      function documentClick(event) {
        if (event.originalEvent.target !== $scope.$button) {
          $scope.hideDropdown();
        }
      }

      $document.on('click', documentClick);
      $scope.$on('$destroy', () => {
        $document.off('click', documentClick);
      });

    },
    controller: function ($scope) {
      $scope.options = [
        {
          title: 'Current URL',
          value: false,
          description: `The URL will link back to this page in the exact state
          that it is in now. If this saved visualization changes
          in the future, those changes will not be reflected.`
        },
        {
          title: 'Saved Object',
          value: true,
          description: `The URL will link back to the saved visualization,
          and will always show the most recently saved version.`
        }
      ];

      $scope.$watch('currentValue', (newValue) => {
        $scope.value = newValue.value;
      });

      $scope.currentValue = $scope.options[0];
      $scope.allowEmbed = $scope.setAllowEmbed ? $scope.setAllowEmbed() : true;

      $scope.dropdownVisible = false;
      $scope.toggle = function ($event) {
        $scope.dropdownStyle = { top: `${$scope.$wrapper.height() + 2}px` };
        $scope.dropdownVisible = !$scope.dropdownVisible;
      };

      $scope.hideDropdown = function () {
        $scope.dropdownVisible = false;
      };

      $scope.setValue = function (option) {
        $scope.currentValue = option;
        $scope.hideDropdown();
      };

      $scope.dropdownClick = function ($event) {
        $event.stopPropagation();
      };
    }
  };
});
