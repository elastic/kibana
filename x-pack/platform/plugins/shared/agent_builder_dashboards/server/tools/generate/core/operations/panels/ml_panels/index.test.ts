/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_STRING_LENGTH } from '@kbn/ml-server-schemas/constants';
import {
  anomalyChartsPanelConfigSchema,
  anomalyChartsPanelDefinition,
  anomalySwimlaneConfigSchema,
  anomalySwimlaneDefinition,
  editAnomalyChartsPanelConfigInputSchema,
  editAnomalySwimlaneConfigInputSchema,
  editSingleMetricViewerConfigInputSchema,
  singleMetricViewerConfigSchema,
  singleMetricViewerPanelDefinition,
} from '.';

describe('anomalyChartsPanelDefinition', () => {
  describe('buildPanelContent', () => {
    it('maps a numeric severity_threshold to an open-ended floor', () => {
      expect(
        anomalyChartsPanelDefinition.buildPanelContent({
          job_ids: ['job-1'],
          severity_threshold: 30,
        })
      ).toEqual({
        type: 'ml_anomaly_charts',
        config: {
          job_ids: ['job-1'],
          severity_threshold: [{ min: 30 }],
        },
      });
    });

    it('passes through an embeddable severity_threshold range array', () => {
      expect(
        anomalyChartsPanelDefinition.buildPanelContent({
          job_ids: ['job-1'],
          severity_threshold: [{ min: 50 }],
        })
      ).toEqual({
        type: 'ml_anomaly_charts',
        config: {
          job_ids: ['job-1'],
          severity_threshold: [{ min: 50 }],
        },
      });
    });

    it('omits severity_threshold when it is not provided', () => {
      expect(
        anomalyChartsPanelDefinition.buildPanelContent({
          job_ids: ['job-1'],
        })
      ).toEqual({
        type: 'ml_anomaly_charts',
        config: {
          job_ids: ['job-1'],
        },
      });
    });

    it('preserves title in the embeddable config', () => {
      expect(
        anomalyChartsPanelDefinition.buildPanelContent({
          job_ids: ['job-1'],
          title: 'Anomaly charts of job-1',
        })
      ).toEqual({
        type: 'ml_anomaly_charts',
        config: {
          job_ids: ['job-1'],
          title: 'Anomaly charts of job-1',
        },
      });
    });
  });

  describe('validateConfigEdit', () => {
    it('accepts editing an anomaly charts panel', () => {
      expect(
        anomalyChartsPanelDefinition.validateConfigEdit?.({
          id: 'panel-1',
          type: 'ml_anomaly_charts',
          config: { job_ids: ['job-1'] },
          grid: { x: 0, y: 0, w: 24, h: 10 },
        })
      ).toEqual({ ok: true });
    });

    it('rejects editing a non-charts panel', () => {
      const result = anomalyChartsPanelDefinition.validateConfigEdit?.({
        id: 'panel-1',
        type: 'lens',
        config: {},
        grid: { x: 0, y: 0, w: 12, h: 5 },
      });

      expect(result?.ok).toBe(false);
      expect((result as { ok: false; error: string }).error).toMatch(/panel-1.*lens/);
    });
  });
});

describe('anomalyChartsPanelConfigSchema', () => {
  it('keeps title instead of stripping it', () => {
    expect(
      anomalyChartsPanelConfigSchema.parse({
        job_ids: ['job-1'],
        title: 'Anomaly charts of job-1',
      })
    ).toEqual({
      job_ids: ['job-1'],
      title: 'Anomaly charts of job-1',
    });
  });

  it('rejects an empty job_ids array', () => {
    expect(
      anomalyChartsPanelConfigSchema.safeParse({
        job_ids: [],
      }).success
    ).toBe(false);
  });

  it('accepts a numeric severity_threshold and an embeddable range array', () => {
    expect(
      anomalyChartsPanelConfigSchema.safeParse({
        job_ids: ['job-1'],
        severity_threshold: 50,
      }).success
    ).toBe(true);
    expect(
      anomalyChartsPanelConfigSchema.safeParse({
        job_ids: ['job-1'],
        severity_threshold: [{ min: 50 }],
      }).success
    ).toBe(true);
  });
});

describe('anomalySwimlaneConfigSchema', () => {
  it('accepts overall swim lane config with severity_threshold and title', () => {
    expect(
      anomalySwimlaneConfigSchema.parse({
        job_ids: ['job-1'],
        swimlane_type: 'overall',
        title: 'Overall anomalies of job-1',
        severity_threshold: 75,
      })
    ).toEqual({
      job_ids: ['job-1'],
      swimlane_type: 'overall',
      title: 'Overall anomalies of job-1',
      severity_threshold: 75,
    });
  });

  it('accepts viewBy swim lane config with severity_threshold', () => {
    expect(
      anomalySwimlaneConfigSchema.parse({
        job_ids: ['job-1'],
        swimlane_type: 'viewBy',
        view_by: 'host.name',
        severity_threshold: 50,
      })
    ).toEqual({
      job_ids: ['job-1'],
      swimlane_type: 'viewBy',
      view_by: 'host.name',
      severity_threshold: 50,
    });
  });
});

describe('anomalySwimlaneDefinition', () => {
  describe('validateConfigEdit', () => {
    it('accepts editing a swim lane panel', () => {
      expect(
        anomalySwimlaneDefinition.validateConfigEdit?.({
          id: 'panel-1',
          type: 'ml_anomaly_swimlane',
          config: { job_ids: ['job-1'], swimlane_type: 'overall' },
          grid: { x: 0, y: 0, w: 24, h: 10 },
        })
      ).toEqual({ ok: true });
    });
  });
});

describe('singleMetricViewerConfigSchema', () => {
  it('accepts bounded selected_entities, function_description, and forecast_id', () => {
    expect(
      singleMetricViewerConfigSchema.parse({
        job_ids: ['job-1'],
        selected_entities: { 'host.name': 'web-01' },
        function_description: 'mean',
        forecast_id: 'forecast-1',
        title: 'Single metric view for job-1',
      })
    ).toEqual(
      expect.objectContaining({
        job_ids: ['job-1'],
        selected_entities: { 'host.name': 'web-01' },
        function_description: 'mean',
        forecast_id: 'forecast-1',
        title: 'Single metric view for job-1',
      })
    );
  });

  it('rejects unbounded function_description and forecast_id', () => {
    expect(
      singleMetricViewerConfigSchema.safeParse({
        job_ids: ['job-1'],
        function_description: 'a'.repeat(MAX_STRING_LENGTH + 1),
      }).success
    ).toBe(false);
    expect(
      singleMetricViewerConfigSchema.safeParse({
        job_ids: ['job-1'],
        forecast_id: 'a'.repeat(MAX_STRING_LENGTH + 1),
      }).success
    ).toBe(false);
  });
});

describe('singleMetricViewerPanelDefinition', () => {
  describe('validateConfigEdit', () => {
    it('accepts editing a single metric viewer panel', () => {
      expect(
        singleMetricViewerPanelDefinition.validateConfigEdit?.({
          id: 'panel-1',
          type: 'ml_single_metric_viewer',
          config: { job_ids: ['job-1'] },
          grid: { x: 0, y: 0, w: 24, h: 18 },
        })
      ).toEqual({ ok: true });
    });
  });
});

describe('ML edit_panels input schemas', () => {
  it('accepts an anomaly charts edit', () => {
    expect(
      editAnomalyChartsPanelConfigInputSchema.safeParse({
        source: 'config',
        type: 'ml_anomaly_charts',
        panelId: 'charts-1',
        config: { job_ids: ['job-1'], severity_threshold: 50, title: 'Updated charts' },
      }).success
    ).toBe(true);
  });

  it('accepts a swim lane edit', () => {
    expect(
      editAnomalySwimlaneConfigInputSchema.safeParse({
        source: 'config',
        type: 'ml_anomaly_swimlane',
        panelId: 'swim-1',
        config: {
          job_ids: ['job-1'],
          swimlane_type: 'viewBy',
          view_by: 'host.name',
          severity_threshold: 75,
        },
      }).success
    ).toBe(true);
  });

  it('accepts a single metric viewer edit', () => {
    expect(
      editSingleMetricViewerConfigInputSchema.safeParse({
        source: 'config',
        type: 'ml_single_metric_viewer',
        panelId: 'smv-1',
        config: {
          job_ids: ['job-1'],
          selected_entities: { 'host.name': 'web-01' },
        },
      }).success
    ).toBe(true);
  });

  it('rejects an edit missing panelId', () => {
    expect(
      editAnomalyChartsPanelConfigInputSchema.safeParse({
        source: 'config',
        type: 'ml_anomaly_charts',
        config: { job_ids: ['job-1'] },
      }).success
    ).toBe(false);
  });
});
