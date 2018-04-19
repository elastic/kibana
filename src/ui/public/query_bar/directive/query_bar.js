import { compact, get } from 'lodash';
import { uiModules } from '../../modules';
import { callAfterBindingsWorkaround } from '../../compat';
import template from './query_bar.html';
import suggestionTemplate from './suggestion.html';
import { getSuggestionsProvider } from '../../kuery';
import './suggestion.less';
import '../../directives/match_pairs';
import './query_popover';

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
      indexPatterns: '='
    },
    controllerAs: 'queryBar',
    bindToController: true,

    controller: callAfterBindingsWorkaround(function ($scope, $element, $http, $timeout, config, PersistedLog, indexPatterns) {
      this.appName = this.appName || 'global';

      this.getIndexPatterns = () => {
        if (compact(this.indexPatterns).length) return Promise.resolve(this.indexPatterns);
        return Promise.all([indexPatterns.getDefault()]);
      };

      this.submit = () => {
        if (this.localQuery.query) {
          this.persistedLog.add(this.localQuery.query);
        }
        this.onSubmit({ $query: this.localQuery });
        this.suggestions = [];
      };

      this.selectLanguage = (language) => {
        this.localQuery.language = language;
        this.localQuery.query = '';
        this.submit();
      };

      this.suggestionTemplate = suggestionTemplate;

      this.handleKeyDown = (event) => {
        if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
          this.updateSuggestions();
        }
      };

      this.updateSuggestions = () => {
        const query = get(this, 'localQuery.query');
        if (typeof query === 'undefined') return;

        this.suggestions = this.getRecentSearchSuggestions(query);
        if (this.localQuery.language !== 'kuery' || !this.getKuerySuggestions) return;

        const { selectionStart, selectionEnd } = $element.find('input')[0];
        this.getKuerySuggestions({ query, selectionStart, selectionEnd })
          .then(suggestions => {
            $scope.$apply(() => this.suggestions = [...suggestions, ...this.suggestions]);
          });
      };

      // TODO: Figure out a better way to set selection
      this.onSuggestionSelect = ({ type, text, start, end }) => {
        const { query } = this.localQuery;
        const inputEl = $element.find('input')[0];
        const { selectionStart, selectionEnd } = inputEl;
        const value = query.substr(0, selectionStart) + query.substr(selectionEnd);

        this.localQuery.query = inputEl.value = value.substr(0, start) + text + value.substr(end);
        inputEl.setSelectionRange(start + text.length, start + text.length);

        if (type === 'recentSearch') {
          this.submit();
        } else {
          this.updateSuggestions();
        }
      };

      this.getRecentSearchSuggestions = (query) => {
        const recentSearches = this.persistedLog.get();
        const matchingRecentSearches = recentSearches.filter(search => search.includes(query));
        return matchingRecentSearches.map(recentSearch => {
          const text = recentSearch;
          const start = 0;
          const end = query.length;
          return { type: 'recentSearch', text, start, end };
        });
      };

      $scope.$watch('queryBar.localQuery.language', (language) => {
        if (!language) return;
        this.persistedLog = new PersistedLog(`typeahead:${this.appName}-${language}`, {
          maxLength: config.get('history:limit'),
          filterDuplicates: true
        });
        this.updateSuggestions();
      });

      $scope.$watch('queryBar.query', (newQuery) => {
        this.localQuery = {
          ...newQuery
        };
      }, true);

      $scope.$watch('queryBar.indexPatterns', () => {
        this.getIndexPatterns().then(indexPatterns => {
          this.getKuerySuggestions = getSuggestionsProvider({ $http, config, indexPatterns });
          this.updateSuggestions();
        });
      });
    })
  };
});
