import _ from 'lodash';
import moment from 'moment';
import { buildRangeFilter } from 'ui/filter_manager/lib/range';

export function UtilsBrushEventProvider(timefilter) {
  return $state => {
    return event => {
      if (!event.data.xAxisField) {
        return;
      }

      if (event.data.xAxisField.type === 'date' &&
        event.data.xAxisField.name === event.data.indexPattern.timeFieldName) {
        setTimefilter();
      } else if (event.data.xAxisField.type === 'date' || event.data.xAxisField.type === 'number') {
        setRange();
      }

      function setTimefilter() {
        const from = moment(event.range[0]);
        const to = moment(event.range[1]);

        if (to - from === 0) return;

        timefilter.time.from = from;
        timefilter.time.to = to;
        timefilter.time.mode = 'absolute';
      }

      function setRange() {
        if (event.range.length <= 1) return;

        const existingFilter = $state.filters.find(filter => (
          filter.meta && filter.meta.key === event.data.xAxisField.name
        ));

        let min = event.range[0];
        let max = event.range[event.range.length - 1];
        // Convert Dates to MS to avoid ES "parse date field" errors
        if (min instanceof Date) {
          min = min.getTime();
        }
        if (max instanceof Date) {
          max = max.getTime();
        }
        const range = { gte: min, lt: max };
        if (_.has(existingFilter, 'range')) {
          existingFilter.range[event.data.xAxisField.name] = range;
        } else if (_.has(existingFilter, 'script.script.params.gte')
          && _.has(existingFilter, 'script.script.params.lt')) {
          existingFilter.script.script.params.gte = min;
          existingFilter.script.script.params.lt = max;
        } else {
          const newFilter = buildRangeFilter(
            event.data.xAxisField,
            range,
            event.data.indexPattern,
            event.data.xAxisFormatter);
          $state.$newFilters = [newFilter];
        }
      }
    };
  };
}
