import { LensConfigBuilder } from '@kbn/lens-embeddable-utils/config_builder';

const cb = new LensConfigBuilder({} as any, {} as any);

const testChart = await cb.build({
  type: 'metric',
  dataset: {
    type: 'index',
    index: 'test',
    time_field: 'test'
  },
  metric: {
    operation: 'count',
  },
  secondary_metric: {
    operation: 'last_value',
    field: 'test',
  },
  breakdown_by: {
    operation: 'terms',
    fields: ['test'],
    size: 5,
    collapse_by: 'avg',
  },
  ignore_global_filters: true,
  samplings: 1,
});

console.log(testChart);


const testChart2 = await cb.reverseBuild(testChart);
console.log(testChart2);

console.log('all done');