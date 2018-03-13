import { uiModules } from 'ui/modules';
import { callAfterBindingsWorkaround } from 'ui/compat';
import template from './query_bar.html';
import { queryLanguages } from '../lib/queryLanguages';
import '../../directives/documentation_href';

const module = uiModules.get('kibana');

module.directive('queryBar', function () {

  return {
    restrict: 'E',
    template: template,
    scope: {
      query: '=',
      appName: '=?',
      onSubmit: '&',
      disableAutoFocus: '='
    },
    controllerAs: 'queryBar',
    bindToController: true,
    controller: callAfterBindingsWorkaround(function ($scope, config, PersistedLog) {
      this.appName = this.appName || 'global';
      this.availableQueryLanguages = queryLanguages;
      this.showLanguageSwitcher = config.get('search:queryLanguage:switcher:enable');

      this.submit = () => {
        if (this.localQuery.query) {
          this.persistedLog.add(this.localQuery.query);
        }
        this.onSubmit({ $query: this.localQuery });
      };

      this.selectLanguage = () => {
        this.localQuery.query = '';
        this.submit();
      };

      this.onTypeaheadSelect = (item) => {
        this.localQuery.query = item;
        this.submit();
      };

      this.updateTypeaheadItems = () => {
        const { persistedLog, localQuery: { query } } = this;
        this.typeaheadItems = persistedLog.get().filter(recentSearch => {
          return recentSearch.includes(query) && recentSearch !== query;
        });
      };

      $scope.$watch('queryBar.query', (newQuery) => {
        this.localQuery = {
          ...newQuery
        };
      }, true);

      $scope.$watch('queryBar.localQuery.language', (language) => {
        this.persistedLog = new PersistedLog(`typeahead:${this.appName}-${language}`, {
          maxLength: config.get('history:limit'),
          filterDuplicates: true
        });
        this.updateTypeaheadItems();
      });

      $scope.$watch('queryBar.localQuery.query', this.updateTypeaheadItems);
    })
  };

});
