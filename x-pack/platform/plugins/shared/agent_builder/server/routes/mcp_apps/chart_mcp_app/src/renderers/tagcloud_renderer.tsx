/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Chart, Settings, Wordcloud } from '@elastic/charts';

import type { TagcloudState, EsqlData } from '../types';
import { toRowObjects, colName } from './data_utils';
import { baseTheme, transparentBackground } from './chart_theme';

interface TagcloudRendererProps {
  spec: TagcloudState;
  data: EsqlData;
}

export const TagcloudRenderer: React.FC<TagcloudRendererProps> = ({ spec, data }) => {
  const rows = toRowObjects(data);
  const tagCol = colName(spec.tag_by);
  const metricCol = colName(spec.metric);

  const wordData = rows.map((r) => ({
    text: String(r[tagCol] ?? ''),
    weight: Number(r[metricCol]) || 0,
  }));

  const minSize = spec.font_size?.min ?? 14;
  const maxSize = spec.font_size?.max ?? 72;

  return (
    <Chart>
      <Settings theme={transparentBackground} baseTheme={baseTheme} />
      <Wordcloud
        id="wordcloud"
        data={wordData}
        weightFn="squareRoot"
        startAngle={spec.orientation === 'vertical' ? -90 : 0}
        endAngle={spec.orientation === 'vertical' ? -90 : spec.orientation === 'angled' ? 90 : 0}
        angleCount={spec.orientation === 'angled' ? 5 : 1}
        padding={1}
        minFontSize={minSize}
        maxFontSize={maxSize}
      />
    </Chart>
  );
};
