/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import { Axis, Position } from '@elastic/charts';

import type { FieldFormat } from '@kbn/field-formats-plugin/common';
import { MULTILAYER_TIME_AXIS_STYLE } from '@kbn/charts-plugin/common';

export const DocumentCountChartAxisX: FC = () => (
  <Axis id="aiops-histogram-left-axis" position={Position.Left} ticks={2} integersOnly />
);

interface DocumentCountChartAxisYProps {
  formatter: FieldFormat;
  useLegacyTimeAxis: boolean;
}

export const DocumentCountChartAxisY: FC<DocumentCountChartAxisYProps> = ({
  formatter,
  useLegacyTimeAxis,
}) => {
  return (
    <Axis
      id="aiops-histogram-bottom-axis"
      position={Position.Bottom}
      showOverlappingTicks={true}
      tickFormat={(value) => formatter.convert(value)}
      labelFormat={useLegacyTimeAxis ? undefined : () => ''}
      timeAxisLayerCount={useLegacyTimeAxis ? 0 : 2}
      style={useLegacyTimeAxis ? {} : MULTILAYER_TIME_AXIS_STYLE}
    />
  );
};
