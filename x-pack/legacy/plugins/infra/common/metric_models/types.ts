/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';
import { metrics } from './metrics';
import { EuiTheme } from '../../../../common/eui_styled_components';

export const ItemTypeRT = rt.keyof({
  host: null,
  pod: null,
  container: null,
  awsEC2: null,
  awsS3: null,
  awsSQS: null,
  awsRDS: null,
});

export const VisTypeRT = rt.keyof({
  line: null,
  area: null,
  bar: null,
});

export const InventoryFormatterTypeRT = rt.keyof({
  abbreviatedNumber: null,
  bits: null,
  bytes: null,
  number: null,
  percent: null,
});
export type InventoryItemType = rt.TypeOf<typeof ItemTypeRT>;

export const InventoryMetricRT = rt.keyof(metrics.tsvb);
export type InventoryMetric = rt.TypeOf<typeof InventoryMetricRT>;

export const SeriesOverridesRT = rt.intersection([
  rt.type({
    color: rt.string,
  }),
  rt.partial({
    type: VisTypeRT,
    name: rt.string,
    formatter: InventoryFormatterTypeRT,
    formatterTemplate: rt.string,
    gaugeMax: rt.number,
  }),
]);

export const VisConfigRT = rt.partial({
  stacked: rt.boolean,
  type: VisTypeRT,
  formatter: InventoryFormatterTypeRT,
  formatterTemplate: rt.string,
  seriesOverrides: rt.record(rt.string, rt.union([rt.undefined, SeriesOverridesRT])),
});

export const SectionTypeRT = rt.keyof({
  chart: null,
  gauges: null,
});

export const SectionRT = rt.intersection([
  rt.type({
    id: InventoryMetricRT,
    label: rt.string,
    requires: rt.array(rt.string),
    visConfig: VisConfigRT,
    type: SectionTypeRT,
  }),
  rt.partial({
    linkToId: rt.string,
  }),
]);

export const InventoryDetailLayoutRT = rt.type({
  id: rt.string,
  label: rt.string,
  sections: rt.array(SectionRT),
});
export type InventoryDetailLayout = rt.TypeOf<typeof InventoryDetailLayoutRT>;

export type InventoryDetailLayoutCreator = (theme: EuiTheme) => InventoryDetailLayout[];

export const TSVBMetricTypeRT = rt.keyof({
  avg: null,
  max: null,
  min: null,
  calculation: null,
  cardinality: null,
  series_agg: null,
  positive_only: null,
  derivative: null,
  count: null,
  sum: null,
  cumulative_sum: null,
});

export const TSVBMetricModelCountRT = rt.type({
  id: rt.string,
  type: rt.literal('count'),
});

export const TSVBMetricModelBasicMetricRT = rt.intersection([
  rt.type({
    id: rt.string,
    type: TSVBMetricTypeRT,
  }),
  rt.partial({
    field: rt.string,
  }),
]);

export const TSVBMetricModelVariableRT = rt.type({
  field: rt.string,
  id: rt.string,
  name: rt.string,
});

export const TSVBMetricModelBucketScriptRT = rt.type({
  id: rt.string,
  script: rt.string,
  type: rt.literal('calculation'),
  variables: rt.array(TSVBMetricModelVariableRT),
});

export const TSVBMetricModelDerivativeRT = rt.type({
  id: rt.string,
  field: rt.string,
  unit: rt.string,
  type: rt.literal('derivative'),
});

export const TSVBMetricModelSeriesAggRT = rt.type({
  id: rt.string,
  function: rt.string,
  type: rt.literal('series_agg'),
});

export const TSVBMetricRT = rt.union([
  TSVBMetricModelCountRT,
  TSVBMetricModelBasicMetricRT,
  TSVBMetricModelBucketScriptRT,
  TSVBMetricModelDerivativeRT,
  TSVBMetricModelSeriesAggRT,
]);
export type TSVBMetric = rt.TypeOf<typeof TSVBMetricRT>;

export const TSVBSeriesRT = rt.intersection([
  rt.type({
    id: rt.string,
    metrics: rt.array(TSVBMetricRT),
    split_mode: rt.string,
  }),
  rt.partial({
    terms_field: rt.string,
    terms_size: rt.number,
    terms_order_by: rt.string,
    filter: rt.type({
      query: rt.string,
      language: rt.keyof({
        lucene: null,
        kuery: null,
      }),
    }),
  }),
]);

export const TSVBMetricModelRT = rt.intersection([
  rt.type({
    id: InventoryMetricRT,
    requires: rt.array(rt.string),
    index_pattern: rt.union([rt.string, rt.array(rt.string)]),
    interval: rt.string,
    time_field: rt.string,
    type: rt.string,
    series: rt.array(TSVBSeriesRT),
  }),
  rt.partial({
    filter: rt.string,
    map_field_to: rt.string,
    id_type: rt.keyof({ cloud: null, node: null }),
  }),
]);

export type TSVBMetricModel = rt.TypeOf<typeof TSVBMetricModelRT>;

export type TSVBMetricModelCreator = (
  timeField: string,
  indexPattern: string | string[],
  interval: string
) => TSVBMetricModel;
