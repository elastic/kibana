/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

export interface Dataset {
  columns: Array<{ name: string; type: string }>;
  rows: any[];
  query: string;
}

export interface VizSpec {
  type: 'lens-esql';
  title?: string;
  preferredChartType: 'Line' | 'Bar' | 'Area';
  yUnit?: string;
  format?: unknown;
  dataRef: string;
  vizTicket: string;
}

// Factory that returns the renderer for <viz />
export function createVizRenderer() {
  return function VizElement(props: { spec: VizSpec }) {
    const { spec } = props;

    return (
      <VisualizeESQL
        lens={pluginsStart.lens}
        dataViews={pluginsStart.dataViews}
        uiActions={pluginsStart.uiActions}
        columns={ds.columns}
        rows={ds.rows}
        query={ds.query}
        preferredChartType={spec.preferredChartType}
        xField={spec.xField}
        yField={spec.yField}
        splitSeriesField={spec.splitSeriesField}
        title={spec.title}
      />
    );
  };
}
