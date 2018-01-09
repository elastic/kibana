import { uiModules } from 'ui/modules';
import { callAfterBindingsWorkaround } from 'ui/compat';
import template from './query_bar.html';
import { queryLanguages } from '../lib/queryLanguages';
import { getSuggestionsProvider } from '../../kuery';
import '../../directives/documentation_href';
import '../../directives/match_pairs';

const module = uiModules.get('kibana');

module.directive('queryBar', function () {

  return {
    restrict: 'E',
    template: template,
    scope: {
      query: '=',
      appName: '=?',
      onSubmit: '&',
      disableAutoFocus: '=',
      indexPattern: '='
    },
    controllerAs: 'queryBar',
    bindToController: true,
    controller: callAfterBindingsWorkaround(function ($scope, $http, config) {
      this.appName = this.appName || 'global';
      this.availableQueryLanguages = queryLanguages;
      this.showLanguageSwitcher = config.get('search:queryLanguage:switcher:enable');
      this.typeaheadKey = () => `${this.appName}-${this.query.language}`;

      this.submit = () => {
        this.onSubmit({ $query: this.localQuery });
      };

      this.selectLanguage = () => {
        this.localQuery.query = '';
        this.submit();
      };

      const getSuggestions = getSuggestionsProvider($http, this.indexPattern);

      this.updateSuggestions = async (e) => {
        const { target } = e;
        const location = {
          start: target.selectionStart,
          end: target.selectionEnd
        };
        this.suggestions = await getSuggestions(this.localQuery.query, location);
      };

      $scope.$watch('queryBar.query', (newQuery) => {
        this.localQuery = {
          ...newQuery
        };
      }, true);
    })
  };
});
