import moment from 'moment';
import buildRangeFilter from 'ui/filter_manager/lib/range';
export default function brushEventProvider(timefilter) {
  return function ($state) {
    return function (event) {
      if (event.data.xAxisField && event.data.xAxisField.type === 'date') {
        let from = moment(event.range[0]);
        let to = moment(event.range[1]);

        if (to - from === 0) return;

        timefilter.time.from = from;
        timefilter.time.to = to;
        timefilter.time.mode = 'absolute';
      } else if (event.data.xAxisField && event.data.xAxisField.type === 'number') {
        let existingFilter = null;
        $state.filters.forEach(function (it) {
          if (it.meta && it.meta.key === event.data.xAxisField.name) {
            existingFilter = it;
          }
        });

        const range = {gte: event.range[0], lt: event.range[event.range.length - 1]};
        if (existingFilter) {
          existingFilter.range[event.data.xAxisField.name] = range;
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
};
