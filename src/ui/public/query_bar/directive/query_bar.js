import { uiModules } from 'ui/modules';
import { callAfterBindingsWorkaround } from 'ui/compat';
import template from './query_bar.html';
import { queryLanguages } from '../lib/queryLanguages';
import { documentationLinks } from '../../documentation_links/documentation_links.js';

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
    controller: callAfterBindingsWorkaround(function ($scope, config, PersistedLog, filterFilter) {
      this.queryDocLinks = documentationLinks.query;
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

      this.onTypeaheadSelect = (item) => {
        this.localQuery.query = item;
        this.submit();
      };

      $scope.$watch('queryBar.localQuery.query', (query) => {
        this.typeaheadItems = filterFilter(persistedLog.get(), query);
      });

      $scope.$watch('queryBar.query', (newQuery) => {
        this.localQuery = Object.assign({}, newQuery);
      }, true);
    })
  };

});
