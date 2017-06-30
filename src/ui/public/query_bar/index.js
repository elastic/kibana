import { uiModules } from 'ui/modules';
import template from './index.html';
import { queryLanguages } from './lib/queryLanguages';
import { documentationLinks } from '../documentation_links/documentation_links.js';

const module = uiModules.get('kibana');

module.directive('queryBar', function () {

  return {
    restrict: 'E',
    template: template,
    scope: {
      query: '=',
      appName: '=?',
      onSubmit: '&',
    },
    controllerAs: 'queryBar',
    bindToController: true,
    controller: function ($scope, config) {
      this.queryDocLinks = documentationLinks.query;
      this.appName = this.appName || 'global';
      this.typeaheadKey = `${this.appName}-${this.query.language}`;
      this.availableQueryLanguages = queryLanguages;
      this.showLanguageSwitcher = config.get('search:queryLanguage:switcher:enable');

      this.submit = () => {
        this.onSubmit({ $query: this.localQuery });
      };

      this.selectLanguage = () => {
        this.localQuery.query = '';
        this.submit();
      };

      $scope.$watch('queryBar.query', (newQuery) => {
        this.localQuery = Object.assign({}, newQuery);
      }, true);
    }
  };

});
