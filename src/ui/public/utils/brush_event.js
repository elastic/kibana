import moment from 'moment';
import buildRangeFilter from 'ui/filter_manager/lib/range';
export default function brushEventProvider(timefilter) {
  return $state => {
    return event => {
      if (!event.data.xAxisField) {
        return;
      }

      switch (event.data.xAxisField.type) {
        case 'date':
          let from = moment(event.range[0]);
          let to = moment(event.range[1]);

          if (to - from === 0) return;

          timefilter.time.from = from;
          timefilter.time.to = to;
          timefilter.time.mode = 'absolute';
          break;

        case 'number':
          if (event.range.length <= 1) return;

          const existingFilter = $state.filters.find(filter => (
            filter.meta && filter.meta.key === event.data.xAxisField.name
          ));

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
          break;
      }
    };
  };
};
