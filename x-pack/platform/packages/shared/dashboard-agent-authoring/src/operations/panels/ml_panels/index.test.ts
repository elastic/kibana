/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_STRING_LENGTH } from '@kbn/ml-server-schemas/constants';
import { buildConfigPanelContent, getEditableEmbeddableTypes } from '..';
import {
  anomalyChartsPanelConfigSchema,
  anomalySwimlaneConfigSchema,
  editAnomalyChartsPanelConfigInputSchema,
  editAnomalySwimlaneConfigInputSchema,
  editSingleMetricViewerConfigInputSchema,
  singleMetricViewerConfigSchema,
} from '.';

describe('ml_anomaly_charts registry entry', () => {
  describe('buildConfigPanelContent', () => {
    it('maps a numeric severity_threshold to an open-ended floor', () => {
      expect(
        buildConfigPanelContent('ml_anomaly_charts', {
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
        buildConfigPanelContent('ml_anomaly_charts', {
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
        buildConfigPanelContent('ml_anomaly_charts', {
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
        buildConfigPanelContent('ml_anomaly_charts', {
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

  describe('getEditableEmbeddableTypes', () => {
    it('edits only anomaly charts panels', () => {
      expect(
        getEditableEmbeddableTypes({
          source: 'config',
          type: 'ml_anomaly_charts',
          config: { job_ids: ['job-1'] },
        })
      ).toEqual(['ml_anomaly_charts']);
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

describe('ml_anomaly_swimlane registry entry', () => {
  describe('getEditableEmbeddableTypes', () => {
    it('edits only swim lane panels', () => {
      expect(
        getEditableEmbeddableTypes({
          source: 'config',
          type: 'ml_anomaly_swimlane',
          config: { job_ids: ['job-1'], swimlane_type: 'overall' },
        })
      ).toEqual(['ml_anomaly_swimlane']);
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

describe('ml_single_metric_viewer registry entry', () => {
  describe('getEditableEmbeddableTypes', () => {
    it('edits only single metric viewer panels', () => {
      expect(
        getEditableEmbeddableTypes({
          source: 'config',
          type: 'ml_single_metric_viewer',
          config: { job_ids: ['job-1'] },
        })
      ).toEqual(['ml_single_metric_viewer']);
    });
  });
});

describe('ML edit input schemas', () => {
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
