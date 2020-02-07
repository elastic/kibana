/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import rt from 'io-ts';
import { EuiTheme } from '../../../../../common/eui_styled_components';
import { InventoryFormatterTypeRT } from '../../../common/inventory_models/types';
import { MetricsTimeInput } from './containers/with_metrics_time';
import { NodeDetailsMetricData } from '../../../common/http_api/node_details_api';

export interface LayoutProps {
  metrics?: NodeDetailsMetricData[];
  onChangeRangeTime?: (time: MetricsTimeInput) => void;
  isLiveStreaming?: boolean;
  stopLiveStreaming?: () => void;
}

export type LayoutPropsWithTheme = LayoutProps & { theme: EuiTheme };

const ChartTypesRT = rt.keyof({
  area: null,
  bar: null,
  line: null,
});

export const SeriesOverridesObjectRT = rt.intersection([
  rt.type({
    color: rt.string,
  }),
  rt.partial({
    name: rt.string,
    formatter: InventoryFormatterTypeRT,
    formatterTemplate: rt.string,
    gaugeMax: rt.number,
    type: ChartTypesRT,
  }),
]);

export const SeriesOverridesRT = rt.record(
  rt.string,
  rt.union([rt.undefined, SeriesOverridesObjectRT])
);

export type SeriesOverrides = rt.TypeOf<typeof SeriesOverridesRT>;

export const VisSectionPropsRT = rt.partial({
  type: ChartTypesRT,
  stacked: rt.boolean,
  formatter: InventoryFormatterTypeRT,
  formatterTemplate: rt.string,
  seriesOverrides: SeriesOverridesRT,
});

export type VisSectionProps = rt.TypeOf<typeof VisSectionPropsRT> & {
  id?: string;
  metric?: NodeDetailsMetricData;
  onChangeRangeTime?: (time: MetricsTimeInput) => void;
  isLiveStreaming?: boolean;
  stopLiveStreaming?: () => void;
};
