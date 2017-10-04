import _ from 'lodash';
import { uiModules } from 'ui/modules';
import { callAfterBindingsWorkaround } from 'ui/compat';
import template from './query_bar.html';
import typeaheadItemTemplate from './typeahead_item.html';
import { queryLanguages } from '../lib/queryLanguages';
import { documentationLinks } from '../../documentation_links/documentation_links.js';
import { fromKueryExpression, getSuggestions } from '../../kuery';
import { functions } from '../../kuery/functions';
import chrome from 'ui/chrome';

const module = uiModules.get('kibana');
const baseUrl = chrome.addBasePath('/api/kibana/suggestions/values');

module.directive('queryBar', function () {

  return {
    restrict: 'E',
    template: template,
    scope: {
      query: '=',
      appName: '=?',
      indexPattern: '=',
      onSubmit: '&',
      disableAutoFocus: '='
    },
    controllerAs: 'queryBar',
    bindToController: true,
    controller: callAfterBindingsWorkaround(function ($scope, $element, $http, config, PersistedLog, filterFilter) {
      this.typeaheadItemTemplate = typeaheadItemTemplate;
      this.queryDocLinks = documentationLinks.query;
      this.appName = this.appName || 'global';
      this.availableQueryLanguages = queryLanguages;
      this.showLanguageSwitcher = config.get('search:queryLanguage:switcher:enable');
      this.typeaheadItems = [];
      this.cursorPosition = 0;

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
        const { start, end, type, value } = item;
        const { localQuery: { query }, inputEl } = this;
        if (type === 'function') {
          this.localQuery.query = inputEl.value = query.substring(0, start) + value + '()' + query.substring(end);
          this.cursorPosition = start + value.length + 1;
        } else if (type === 'field' || type === 'value') {
          this.localQuery.query = inputEl.value = query.substring(0, start) + '"' + value + '"' + query.substring(end);
          this.cursorPosition = start + value.length + 2;
        } else if (type === 'argument') {
          this.localQuery.query = inputEl.value = query.substring(0, start) + value + '=' + query.substring(end);
          this.cursorPosition = start + value.length + 1;
        }
        inputEl.setSelectionRange(this.cursorPosition, this.cursorPosition);
        this.updateSuggestions();
      };

      this.updateSuggestions = async () => {
        try {
          const { cursorPosition, indexPattern, localQuery: { query } } = this;
          const node = fromKueryExpression(query);
          const suggestions = getSuggestions(node, cursorPosition);
          const { start, end, types, params } = suggestions;
          this.typeaheadItems = await types.reduce(async (items, type) => {
            items = await items;
            if (type === 'function') {
              const functionNames = getFunctionNameSuggestions(functions, params)
                .map(value => ({ start, end, type, value }));
              return [...items, ...functionNames];
            } else if (type === 'argument') {
              const argNames = getArgNameSuggestions(params)
                .map(value => ({ start, end, type, value }));
              return [...items, ...argNames];
            } else if (type === 'field') {
              const fieldNames = getFieldNameSuggestions(indexPattern.fields, params)
                .map(value => ({ start, end, type, value }));
              return [...items, ...fieldNames];
            } else if (type === 'value') {
              const { fieldName, query } = params;
              const field = indexPattern.fields.byName[fieldName];
              const values = (await getValueSuggestions(field, query))
                .map(value => ({ start, end, type, value }));
              return [...items, ...values];
            }
          }, []);
        } catch (e) {
          this.typeaheadItems = [];
        }
        $scope.$digest();
      };

      this.updateCursorPosition = (event) => {
        const { currentTarget } = event;
        const { selectionEnd } = currentTarget;
        this.inputEl = currentTarget;
        this.cursorPosition = selectionEnd;
      };

      $scope.$watch('queryBar.query', (newQuery) => {
        this.localQuery = { ...newQuery };
      }, true);

      $scope.$watchGroup(['queryBar.localQuery.query', 'queryBar.cursorPosition'], this.updateSuggestions);

      function getFunctionNameSuggestions(functions, query) {
        const functionNames = Object.keys(functions);
        return filterFilter(functionNames, query);
      }

      function getArgNameSuggestions({ argNames, query }) {
        return filterFilter(argNames, query);
      }

      function getFieldNameSuggestions(fields, { types, query }) {
        const fieldNames = fields
          .filter(field => types == null || types.includes(field.type))
          .map(field => field.name);
        return filterFilter(fieldNames, query);
      }

      async function getValueSuggestions(field, query) {
        if (!_.get(field, 'aggregatable') || field.type !== 'string') {
          return [];
        }

        const params = {
          query,
          field: field.name
        };

        try {
          const response = await $http.post(`${baseUrl}/${field.indexPattern.title}`, params);
          return response.data;
        } catch (e) {
          return [];
        }
      }
    })
  };
});
