/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

export interface SingleMetricViewerOpenOptions {
  readonly jobId: string;
  readonly from: string;
  readonly to: string;
  readonly entities?: Readonly<Record<string, string>>;
}

const toRisonString = (value: string): string => `'${value.replace(/[!']/g, '!$&')}'`;

export class SingleMetricViewerPage {
  readonly chart: Locator;
  readonly focusValuesLine: Locator;
  readonly contextValuesLine: Locator;
  readonly anomalyMarkers: Locator;
  readonly chartDataError: Locator;

  constructor(private readonly page: ScoutPage) {
    this.chart = this.page.testSubj.locator('mlSingleMetricViewerChart');
    this.focusValuesLine = this.page.testSubj.locator('mlSingleMetricViewerFocusValuesLine');
    this.contextValuesLine = this.page.testSubj.locator('mlSingleMetricViewerContextValuesLine');
    this.anomalyMarkers = this.chart.locator('[data-test-subj="mlAnomalyMarker"]');
    this.chartDataError = this.page.testSubj.locator('mlTimeSeriesExplorerChartDataError');
  }

  /** Opens the viewer for a job and waits for the focus chart to draw its source data. */
  async open({ jobId, from, to, entities }: SingleMetricViewerOpenOptions): Promise<void> {
    const globalState = `(ml:(jobIds:!(${toRisonString(jobId)})),time:(from:${toRisonString(
      from
    )},to:${toRisonString(to)}))`;
    const entityState = entities
      ? `,entities:(${Object.entries(entities)
          .map(([fieldName, fieldValue]) => `${fieldName}:${toRisonString(fieldValue)}`)
          .join(',')})`
      : '';
    const appState = `(timeseriesexplorer:(mlTimeSeriesExplorer:(detectorIndex:0${entityState})))`;

    await this.page.gotoApp('ml/timeseriesexplorer', {
      params: { _g: globalState, _a: appState },
      readyWhen: this.chart,
    });
    // The focus line has no path, and so no size, until the focus data and anomalies have loaded.
    await this.focusValuesLine.waitFor({ state: 'visible' });
  }

  async getFocusLinePath(): Promise<string> {
    return (await this.focusValuesLine.getAttribute('d')) ?? '';
  }

  async getContextLinePath(): Promise<string> {
    return (await this.contextValuesLine.getAttribute('d')) ?? '';
  }
}
