/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { LensChartPayload } from './types';
import { XYRenderer } from './renderers/xy_renderer';
import { MetricRenderer } from './renderers/metric_renderer';
import { PieRenderer } from './renderers/pie_renderer';
import { GaugeRenderer } from './renderers/gauge_renderer';
import { HeatmapRenderer } from './renderers/heatmap_renderer';
import { TagcloudRenderer } from './renderers/tagcloud_renderer';
import { PartitionRenderer } from './renderers/partition_renderer';
import { TableRenderer } from './renderers/table_renderer';

interface LensRendererProps {
  payload: LensChartPayload;
}

export const LensRenderer: React.FC<LensRendererProps> = ({ payload }) => {
  const { visualization: spec, data } = payload;

  if (!data || !data.columns || !data.values) {
    return <div style={{ padding: '1rem', textAlign: 'center' }}>No data available</div>;
  }

  const title = 'title' in spec ? spec.title : undefined;

  const renderChart = () => {
    switch (spec.type) {
      case 'xy':
        return <XYRenderer spec={spec} data={data} />;

      case 'metric':
        return <MetricRenderer spec={spec} data={data} />;

      case 'pie':
      case 'donut':
        return <PieRenderer spec={spec} data={data} />;

      case 'gauge':
        return <GaugeRenderer spec={spec} data={data} />;

      case 'heatmap':
        return <HeatmapRenderer spec={spec} data={data} />;

      case 'tag_cloud':
        return <TagcloudRenderer spec={spec} data={data} />;

      case 'treemap':
      case 'waffle':
      case 'mosaic':
        return <PartitionRenderer spec={spec} data={data} />;

      case 'data_table':
      case 'legacy_metric':
      case 'region_map':
        return <TableRenderer spec={spec} data={data} />;

      default:
        return (
          <div style={{ padding: '1rem', textAlign: 'center' }}>
            Unsupported chart type: {(spec as any).type}
          </div>
        );
    }
  };

  return (
    <div style={{ padding: '1rem' }}>
      {title && (
        <h1
          style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            marginBottom: '1rem',
            textAlign: 'center',
          }}
        >
          {title}
        </h1>
      )}
      <div
        style={{
          height:
            spec.type === 'data_table' ||
            spec.type === 'legacy_metric' ||
            spec.type === 'region_map'
              ? 'auto'
              : 300,
        }}
      >
        {renderChart()}
      </div>
    </div>
  );
};
