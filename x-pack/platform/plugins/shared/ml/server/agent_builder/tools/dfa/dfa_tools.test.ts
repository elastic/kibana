/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DFA_SCATTERPLOT_MATRIX_ATTACHMENT_TYPE,
  DFA_TOTAL_FEATURE_IMPORTANCE_ATTACHMENT_TYPE,
} from '../../attachment_types/constants';
import { trainingPercentForSourceSize } from './job_config';
import { createDfaGetJobTool } from './dfa_get_job';
import { createDfaExplainTool } from './dfa_explain';
import { createDfaCreateJobTool } from './dfa_create_job';
import { createDfaManageJobTool } from './dfa_manage_job';
import { createDfaDeleteJobTool } from './dfa_delete_job';
import { createDfaEvaluateTool } from './dfa_evaluate';
import {
  adminCapabilities,
  createContext,
  resolveWith,
  resultData,
  securityException,
} from './test_helpers';

const flightConfig = {
  id: 'flight-delay',
  source_index: 'kibana_sample_data_flights',
  dest_index: 'flight-delay-results',
  analysis_type: 'classification' as const,
  dependent_variable: 'FlightDelay',
};

const createMlClient = () => ({
  explainDataFrameAnalytics: jest.fn().mockResolvedValue({ field_selection: [] }),
  putDataFrameAnalytics: jest.fn().mockResolvedValue({ id: 'flight-delay' }),
  getDataFrameAnalytics: jest.fn().mockResolvedValue({
    data_frame_analytics: [{ id: 'flight-delay', dest: { index: 'flight-delay-results' } }],
  }),
  getDataFrameAnalyticsStats: jest.fn().mockResolvedValue({
    data_frame_analytics: [{ id: 'flight-delay', state: 'stopped' }],
  }),
  startDataFrameAnalytics: jest.fn().mockResolvedValue({ started: true }),
  stopDataFrameAnalytics: jest.fn().mockResolvedValue({ stopped: true }),
  updateDataFrameAnalytics: jest.fn().mockResolvedValue({ updated: true }),
  deleteDataFrameAnalytics: jest.fn().mockResolvedValue({ acknowledged: true }),
  evaluateDataFrame: jest.fn().mockResolvedValue({ classification: { accuracy: 0.9 } }),
});

describe('data frame analytics tools', () => {
  it('explain names the missing create privilege', async () => {
    const capabilities = { ...adminCapabilities(), canCreateDataFrameAnalytics: false };
    const tool = createDfaExplainTool({ resolveMlCapabilities: resolveWith(capabilities) });
    const result = await tool.handler({ job_id: 'flight-delay' }, createContext());
    expect(resultData(result)?.message).toContain('canCreateDataFrameAnalytics');
  });

  it('explain returns the user security_exception instead of a bare 403', async () => {
    const mlClient = createMlClient();
    mlClient.explainDataFrameAnalytics.mockRejectedValue(
      securityException('action [indices:data/read/search] is unauthorized for indices [logs-app]')
    );
    const tool = createDfaExplainTool({
      resolveMlCapabilities: resolveWith(adminCapabilities()),
      buildMlClient: () => mlClient as any,
    });
    const result = await tool.handler(
      {
        source_index: 'logs-app',
        dest_index: 'logs-outliers',
        analysis_type: 'outlier_detection',
      },
      createContext()
    );
    const message = resultData(result)?.message ?? '';
    expect(message).toContain('security_exception');
    expect(message).toContain('logs-app');
    expect(message).not.toBe('403');
  });

  it('create applies training percent 80 and does not start the job', async () => {
    const mlClient = createMlClient();
    const tool = createDfaCreateJobTool({
      resolveMlCapabilities: resolveWith(adminCapabilities()),
      buildMlClient: () => mlClient as any,
    });
    const result = await tool.handler(flightConfig, createContext());
    expect(mlClient.putDataFrameAnalytics).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'flight-delay',
        body: expect.objectContaining({
          analysis: { classification: expect.objectContaining({ training_percent: 80 }) },
        }),
      })
    );
    expect(mlClient.startDataFrameAnalytics).not.toHaveBeenCalled();
    expect(resultData(result)).toEqual(
      expect.objectContaining({ created: true, training_percent_applied: 80, started: false })
    );
  });

  it('create uses 60 for about 700 source documents and 10 above 100000', async () => {
    expect(trainingPercentForSourceSize(699)).toBe(60);
    expect(trainingPercentForSourceSize(150_000)).toBe(10);
    expect(trainingPercentForSourceSize(10_000)).toBe(80);
    expect(trainingPercentForSourceSize(3_000_000)).toBe(6);
    expect(trainingPercentForSourceSize(250)).toBe(80);

    const mlClient = createMlClient();
    const tool = createDfaCreateJobTool({
      resolveMlCapabilities: resolveWith(adminCapabilities()),
      buildMlClient: () => mlClient as any,
    });
    const context = createContext();
    context.esClient.asCurrentUser.count = jest.fn().mockResolvedValue({ count: 699 });
    await tool.handler(flightConfig, context);
    expect(mlClient.putDataFrameAnalytics).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          analysis: { classification: expect.objectContaining({ training_percent: 60 }) },
        }),
      })
    );

    mlClient.putDataFrameAnalytics.mockClear();
    context.esClient.asCurrentUser.count.mockResolvedValue({ count: 150_000 });
    await tool.handler(flightConfig, context);
    expect(mlClient.putDataFrameAnalytics).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          analysis: { classification: expect.objectContaining({ training_percent: 10 }) },
        }),
      })
    );

    mlClient.putDataFrameAnalytics.mockClear();
    await tool.handler({ ...flightConfig, training_percent: 20 }, context);
    expect(mlClient.putDataFrameAnalytics).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          analysis: { classification: expect.objectContaining({ training_percent: 20 }) },
        }),
      })
    );
  });

  it('create stores an outlier share and rejects it on classification', async () => {
    const mlClient = createMlClient();
    const tool = createDfaCreateJobTool({
      resolveMlCapabilities: resolveWith(adminCapabilities()),
      buildMlClient: () => mlClient as any,
    });
    await tool.handler(
      {
        id: 'weblog-outliers',
        source_index: 'weblog-clients',
        dest_index: 'weblog-outliers',
        analysis_type: 'outlier_detection',
        outlier_fraction: 0.3,
      },
      createContext()
    );
    expect(mlClient.putDataFrameAnalytics).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          analysis: { outlier_detection: { outlier_fraction: 0.3 } },
        }),
      })
    );

    const rejected = await tool.handler(
      { ...flightConfig, outlier_fraction: 0.3 },
      createContext()
    );
    expect(resultData(rejected)?.message).toContain('outlier_fraction');
    expect(mlClient.putDataFrameAnalytics).toHaveBeenCalledTimes(1);
  });

  it('create returns the user security_exception for a forbidden source index', async () => {
    const mlClient = createMlClient();
    mlClient.putDataFrameAnalytics.mockRejectedValue(
      securityException(
        'action [indices:data/read/search] is unauthorized for indices [secret-index]'
      )
    );
    const tool = createDfaCreateJobTool({
      resolveMlCapabilities: resolveWith(adminCapabilities()),
      buildMlClient: () => mlClient as any,
    });
    const result = await tool.handler(
      { ...flightConfig, source_index: 'secret-index' },
      createContext()
    );
    expect(resultData(result)?.message).toContain('security_exception');
    expect(resultData(result)?.message).toContain('secret-index');
  });

  it('start reports already_running and does not call start', async () => {
    const mlClient = createMlClient();
    mlClient.getDataFrameAnalyticsStats.mockResolvedValue({
      data_frame_analytics: [{ id: 'flight-delay', state: 'started' }],
    });
    const tool = createDfaManageJobTool({
      resolveMlCapabilities: resolveWith(adminCapabilities()),
      buildMlClient: () => mlClient as any,
    });
    const result = await tool.handler(
      { operation: 'start', job_id: 'flight-delay' },
      createContext()
    );
    expect(mlClient.startDataFrameAnalytics).not.toHaveBeenCalled();
    expect(resultData(result)).toEqual(
      expect.objectContaining({ started: false, reason: 'already_running', state: 'started' })
    );
  });

  it('stop without force does not stop an already stopped job', async () => {
    const mlClient = createMlClient();
    const tool = createDfaManageJobTool({
      resolveMlCapabilities: resolveWith(adminCapabilities()),
      buildMlClient: () => mlClient as any,
    });
    const result = await tool.handler(
      { operation: 'stop', job_id: 'flight-delay' },
      createContext()
    );
    expect(mlClient.stopDataFrameAnalytics).not.toHaveBeenCalled();
    expect(resultData(result)).toEqual(
      expect.objectContaining({ stopped: false, reason: 'already_stopped' })
    );
  });

  it('update while started is refused', async () => {
    const mlClient = createMlClient();
    mlClient.getDataFrameAnalyticsStats.mockResolvedValue({
      data_frame_analytics: [{ id: 'flight-delay', state: 'started' }],
    });
    const tool = createDfaManageJobTool({
      resolveMlCapabilities: resolveWith(adminCapabilities()),
      buildMlClient: () => mlClient as any,
    });
    const result = await tool.handler(
      { operation: 'update', job_id: 'flight-delay', model_memory_limit: '100mb' },
      createContext()
    );
    expect(mlClient.updateDataFrameAnalytics).not.toHaveBeenCalled();
    expect(resultData(result)?.message).toContain('Stop the job');
  });

  const dataViewsFor = (dataViewDelete = jest.fn().mockResolvedValue({})) => ({
    getDataViews: () => ({
      dataViewsServiceFactory: async () => ({
        find: async (title: string) => [{ id: 'dv-1', title }],
        delete: dataViewDelete,
      }),
    }),
  });

  it('delete confirmation names the destination index and its documents', async () => {
    const tool = createDfaDeleteJobTool({
      resolveMlCapabilities: resolveWith(adminCapabilities()),
    });
    const removed = await tool.confirmation!.getConfirmation!({
      toolParams: {
        job_id: 'flight-delay',
        dest_index: 'flight-delay-results',
      },
      context: createContext(),
    });
    expect(removed.message).toContain('flight-delay-results');
    expect(removed.message).toContain('every document');
    expect(removed.message).toContain('data view');
  });

  it('delete removes the destination index, its documents, and the data view with the job', async () => {
    const mlClient = createMlClient();
    const indicesDelete = jest.fn().mockResolvedValue({ acknowledged: true });
    const dataViewDelete = jest.fn().mockResolvedValue({});
    const tool = createDfaDeleteJobTool({
      resolveMlCapabilities: resolveWith(adminCapabilities()),
      buildMlClient: () => mlClient as any,
      ...dataViewsFor(dataViewDelete),
    } as any);
    const result = await tool.handler({ job_id: 'flight-delay' }, createContext(indicesDelete));
    expect(indicesDelete).toHaveBeenCalledWith({ index: 'flight-delay-results' });
    expect(dataViewDelete).toHaveBeenCalledWith('dv-1');
    expect(mlClient.deleteDataFrameAnalytics).toHaveBeenCalledWith({
      id: 'flight-delay',
      force: false,
    });
    expect(resultData(result)).toEqual(
      expect.objectContaining({
        deleted: true,
        destination_index: 'flight-delay-results',
        destination_index_deleted: true,
        data_view_deleted: true,
      })
    );
  });

  it('a forbidden destination delete does not delete the job or the data view', async () => {
    const mlClient = createMlClient();
    const indicesDelete = jest
      .fn()
      .mockRejectedValue(securityException('unauthorized for indices [flight-delay-results]'));
    const dataViewDelete = jest.fn();
    const tool = createDfaDeleteJobTool({
      resolveMlCapabilities: resolveWith(adminCapabilities()),
      buildMlClient: () => mlClient as any,
      ...dataViewsFor(dataViewDelete),
    } as any);
    const result = await tool.handler({ job_id: 'flight-delay' }, createContext(indicesDelete));
    expect(dataViewDelete).not.toHaveBeenCalled();
    expect(mlClient.deleteDataFrameAnalytics).not.toHaveBeenCalled();
    expect(resultData(result)?.message).toContain('security_exception');
    expect(resultData(result)?.message).toContain('flight-delay-results');
  });

  it('evaluate defaults to the test split and uses the get privilege', async () => {
    const denied = createDfaEvaluateTool({
      resolveMlCapabilities: resolveWith({
        ...adminCapabilities(),
        canGetDataFrameAnalytics: false,
      }),
    });
    const deniedResult = await denied.handler(
      {
        index: 'flight-delay-results',
        evaluation_type: 'classification',
        actual_field: 'FlightDelay',
        predicted_field: 'ml.FlightDelay_prediction',
      },
      createContext()
    );
    expect(resultData(deniedResult)?.message).toContain('canGetDataFrameAnalytics');

    const mlClient = createMlClient();
    const tool = createDfaEvaluateTool({
      resolveMlCapabilities: resolveWith(adminCapabilities()),
      buildMlClient: () => mlClient as any,
    });
    await tool.handler(
      {
        index: 'flight-delay-results',
        evaluation_type: 'classification',
        actual_field: 'FlightDelay',
        predicted_field: 'ml.FlightDelay_prediction',
      },
      createContext()
    );
    expect(mlClient.evaluateDataFrame).toHaveBeenCalledWith({
      body: expect.objectContaining({
        index: 'flight-delay-results',
        query: { term: { 'ml.is_training': false } },
      }),
    });

    mlClient.evaluateDataFrame.mockClear();
    await tool.handler(
      {
        index: 'weblog-outliers',
        evaluation_type: 'outlier_detection',
        actual_field: 'is_outlier',
      },
      createContext()
    );
    expect(mlClient.evaluateDataFrame).toHaveBeenCalledWith({
      body: expect.objectContaining({
        evaluation: {
          outlier_detection: expect.objectContaining({
            metrics: expect.objectContaining({
              confusion_matrix: { at: [0.25, 0.5, 0.75] },
            }),
          }),
        },
      }),
    });
  });

  it('returns a total feature importance chart when model totals exist', async () => {
    const mlClient = createMlClient();
    mlClient.getDataFrameAnalytics.mockResolvedValue({
      data_frame_analytics: [
        {
          id: 'flight-delay',
          dest: { index: 'flight-delay-results' },
          analysis: { classification: { dependent_variable: 'FlightDelay' } },
        },
      ],
    });
    const totals = [
      {
        feature_name: 'Origin',
        classes: [
          {
            class_name: 'true',
            importance: { mean_magnitude: 0.4, min: 0, max: 1 },
          },
          {
            class_name: 'false',
            importance: { mean_magnitude: 0.4, min: 0, max: 1 },
          },
        ],
      },
    ];
    const getTrainedModels = jest.fn().mockImplementation(async (params: { include?: string }) => ({
      trained_model_configs: [
        {
          model_id: 'flight-delay-1',
          metadata: {
            analytics_config: { id: 'flight-delay' },
            ...(params.include === 'total_feature_importance'
              ? { total_feature_importance: totals }
              : { feature_importance_baseline: { baseline: 0.1 } }),
          },
        },
      ],
    }));
    const attachmentsAdd = jest.fn().mockImplementation(async (input: { type: string }) => ({
      id: input.type === DFA_SCATTERPLOT_MATRIX_ATTACHMENT_TYPE ? 'splom-1' : 'att-1',
      current_version: 1,
    }));
    const tool = createDfaGetJobTool({
      resolveMlCapabilities: resolveWith(adminCapabilities()),
      buildMlClient: () => ({ ...mlClient, getTrainedModels } as any),
    });
    const result = await tool.handler(
      { job_id: 'flight-delay', include_model_metadata: true },
      { ...createContext(), attachments: { add: attachmentsAdd } }
    );

    expect(attachmentsAdd).toHaveBeenCalledWith({
      type: DFA_TOTAL_FEATURE_IMPORTANCE_ATTACHMENT_TYPE,
      data: {
        job_id: 'flight-delay',
        analysis_type: 'classification',
        total_feature_importance: totals,
      },
      description: 'Total feature importance: flight-delay',
      readonly: true,
    });
    expect(attachmentsAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        type: DFA_SCATTERPLOT_MATRIX_ATTACHMENT_TYPE,
        data: expect.objectContaining({
          job_id: 'flight-delay',
          analysis_type: 'classification',
          index: 'flight-delay-results',
          dependent_variable: 'FlightDelay',
        }),
        readonly: true,
      })
    );
    expect(resultData(result)?.model_metadata).toEqual(
      expect.objectContaining({
        available: true,
        chart_attachment: {
          attachment_id: 'att-1',
          version: 1,
          render: '<render_attachment id="att-1" version="1" />',
        },
      })
    );
    expect(resultData(result)?.scatterplot_attachment).toEqual({
      attachment_id: 'splom-1',
      version: 1,
      render: '<render_attachment id="splom-1" version="1" />',
    });
    expect(resultData(result)?.confusion_matrix_attachment).toBeUndefined();
  });

  it('creates a scatterplot and skips feature importance for an outlier job', async () => {
    const mlClient = createMlClient();
    mlClient.getDataFrameAnalytics.mockResolvedValue({
      data_frame_analytics: [
        {
          id: 'weblog-outliers',
          dest: { index: 'weblog-outliers' },
          analysis: { outlier_detection: {} },
        },
      ],
    });
    const attachmentsAdd = jest.fn().mockResolvedValue({ id: 'splom-1', current_version: 1 });
    const tool = createDfaGetJobTool({
      resolveMlCapabilities: resolveWith(adminCapabilities()),
      buildMlClient: () => mlClient as any,
    });
    const result = await tool.handler(
      { job_id: 'weblog-outliers', include_model_metadata: true },
      { ...createContext(), attachments: { add: attachmentsAdd } }
    );

    expect(attachmentsAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        type: DFA_SCATTERPLOT_MATRIX_ATTACHMENT_TYPE,
        data: expect.objectContaining({
          job_id: 'weblog-outliers',
          analysis_type: 'outlier_detection',
          index: 'weblog-outliers',
        }),
      })
    );
    expect(attachmentsAdd).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: DFA_TOTAL_FEATURE_IMPORTANCE_ATTACHMENT_TYPE })
    );
    expect(resultData(result)?.model_metadata).toEqual(
      expect.objectContaining({ available: false })
    );
    expect(resultData(result)?.scatterplot_attachment).toEqual(
      expect.objectContaining({ attachment_id: expect.any(String) })
    );
  });
});
