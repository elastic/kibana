import { INDEX_NAMES } from '../../../../common/constants';
import { QueryContext } from './elasticsearch_monitor_states_adapter';

export const mostRecentCheckGroups = async (queryContext: QueryContext, monitorIds: string[]) => {
  const params = {
    index: INDEX_NAMES.HEARTBEAT,
    body: {
      size: 0,
      query: {
        terms: { 'monitor.id': monitorIds },
      },
      aggs: {
        monitor: {
          terms: { field: 'monitor.id', size: monitorIds.length },
          aggs: {
            location: {
              terms: { field: 'observer.geo.name', missing: 'N/A', size: 100 },
              aggs: {
                top: {
                  top_hits: {
                    sort: [{ '@timestamp': 'desc' }],
                    _source: {
                      includes: ['monitor.check_group', '@timestamp', 'summary.up', 'summary.down'],
                    },
                    size: 1,
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  return await queryContext.database.search(queryContext.request, params);
};
