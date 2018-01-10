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

    controller: callAfterBindingsWorkaround(function ($scope, $element, $http, config, PersistedLog) {
      this.appName = this.appName || 'global';
      this.availableQueryLanguages = queryLanguages;
      this.showLanguageSwitcher = config.get('search:queryLanguage:switcher:enable');

      const persistedLog = new PersistedLog(`typeahead:${this.appName}-${this.query.language}`, {
        maxLength: config.get('history:limit'),
        filterDuplicates: true
      });

      this.submit = () => {
        if (this.localQuery.query) {
          persistedLog.add(this.localQuery.query);
        }
        this.onSubmit({ $query: this.localQuery });
      };

      this.selectLanguage = () => {
        this.localQuery.query = '';
        this.submit();
      };

      const getSuggestions = getSuggestionsProvider($http, this.indexPattern);

      this.updateSuggestions = async () => {
        const inputEl = $element.find('input')[0];
        const { selectionStart, selectionEnd, value } = inputEl;
        this.suggestions = await getSuggestions(value, selectionStart, selectionEnd);
      };

      // TODO: Figure out a better way to set selection
      this.onTypeaheadSelect = (item) => {
        const { query } = this.localQuery;
        const { start, end } = this.suggestions;
        const inputEl = $element.find('input')[0];
        this.localQuery.query = inputEl.value = query.substr(0, start) + item + query.substr(end);
        inputEl.setSelectionRange(start + item.length, start + item.length);
        this.updateSuggestions();
      };

      $scope.$watch('queryBar.query', (newQuery) => {
        this.localQuery = {
          ...newQuery
        };
      }, true);
    })
  };
});
