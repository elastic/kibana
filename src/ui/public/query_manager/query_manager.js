import _ from 'lodash';
import { FilterManagerProvider } from 'ui/filter_manager';
import { FilterBarLibMapAndFlattenFiltersProvider } from 'ui/filter_bar/lib/map_and_flatten_filters';
import { FilterBarLibExtractTimeFilterProvider } from 'ui/filter_bar/lib/extract_time_filter';
import { FilterBarLibChangeTimeFilterProvider } from 'ui/filter_bar/lib/change_time_filter';
import { toKueryExpression, fromKueryExpression, nodeTypes, filterToKueryAST } from 'ui/kuery';

export function QueryManagerProvider(Private) {
  const filterManager = Private(FilterManagerProvider);
  const mapAndFlattenFilters = Private(FilterBarLibMapAndFlattenFiltersProvider);
  const extractTimeFilter = Private(FilterBarLibExtractTimeFilterProvider);
  const changeTimeFilter = Private(FilterBarLibChangeTimeFilterProvider);

  return function (state) {

    function add(field, values = [], operation, index) {
      const fieldName = _.isObject(field) ? field.name : field;

      if (!Array.isArray(values)) {
        values = [values];
      }

      if (state.query.language === 'lucene') {
        filterManager.add(field, values, operation, index);
      }

      if (state.query.language === 'kuery') {
        const negate = operation === '-';
        const isExistsQuery = fieldName === '_exists_';

        const newQueries = values.map((value) => {
          const newQuery = isExistsQuery
            ? nodeTypes.function.buildNode('exists', value)
            : nodeTypes.function.buildNode('is', fieldName, value);

          return negate ? nodeTypes.function.buildNode('not', newQuery) : newQuery;
        });

        const allQueries = _.isEmpty(state.query.query)
          ? newQueries
          : [fromKueryExpression(state.query.query), ...newQueries];

        state.query = {
          query: toKueryExpression(nodeTypes.function.buildNode('and', allQueries, 'implicit')),
          language: 'kuery'
        };
      }
    }

    async function addLegacyFilter(filter) {
      // The filter_bar directive currently handles filter creation when lucene is the selected language,
      // so we only handle updating the kuery AST here.
      if (state.query.language === 'kuery') {
        const timeFilter = await extractTimeFilter([filter]);
        if (timeFilter) {
          changeTimeFilter(timeFilter);
        }
        else {
          const [ mappedFilter ] = await mapAndFlattenFilters([filter]);
          const newQuery = filterToKueryAST(mappedFilter);
          const allQueries = _.isEmpty(state.query.query)
            ? [newQuery]
            : [fromKueryExpression(state.query.query), newQuery];

          state.query = {
            query: toKueryExpression(nodeTypes.function.buildNode('and', allQueries, 'implicit')),
            language: 'kuery'
          };
        }
      }
    }

    return {
      add,
      addLegacyFilter,
    };

  };
}
