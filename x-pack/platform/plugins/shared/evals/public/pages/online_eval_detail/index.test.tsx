/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Router, Route } from '@kbn/shared-ux-router';
import { API_VERSIONS, EVALS_ONLINE_SCORES_URL } from '@kbn/evals-common';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { OnlineEvalDetailPage } from '.';
import {
  useDeleteOnlineEvalWorkflow,
  useOnlineEvalWorkflow,
  useToggleOnlineEvalWorkflow,
  useUpdateOnlineEvalWorkflow,
} from '../../hooks/use_online_eval_workflows';
import { useEvalsPermissions } from '../../hooks/use_evals_permissions';
import { useEvalsTraceFetcher } from '../../hooks/use_evals_api';
import { useModelConnectors } from '../../hooks/use_model_connectors';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(),
}));

jest.mock('../../hooks/use_online_eval_workflows');
jest.mock('../../hooks/use_evals_permissions');
jest.mock('../../hooks/use_evals_api');
jest.mock('../../hooks/use_model_connectors');

jest.mock('@kbn/lens-embeddable-utils', () => ({
  LensConfigBuilder: jest.fn().mockImplementation(() => ({
    fromAPIFormat: (config: unknown) => config,
  })),
}));

jest.mock('@kbn/llm-trace-waterfall', () => ({
  TraceWaterfall: ({ traceId }: { traceId: string }) => (
    <div data-test-subj="mockTraceWaterfall">{`Trace waterfall ${traceId}`}</div>
  ),
  useTraceSpans: () => ({
    spans: [],
    durationMs: 0,
    isLoading: false,
    error: undefined,
  }),
}));

const mockedUseKibana = jest.mocked(useKibana);
const mockedUseOnlineEvalWorkflow = jest.mocked(useOnlineEvalWorkflow);
const mockedUseToggleOnlineEvalWorkflow = jest.mocked(useToggleOnlineEvalWorkflow);
const mockedUseDeleteOnlineEvalWorkflow = jest.mocked(useDeleteOnlineEvalWorkflow);
const mockedUseUpdateOnlineEvalWorkflow = jest.mocked(useUpdateOnlineEvalWorkflow);
const mockedUseEvalsPermissions = jest.mocked(useEvalsPermissions);
const mockedUseEvalsTraceFetcher = jest.mocked(useEvalsTraceFetcher);
const mockedUseModelConnectors = jest.mocked(useModelConnectors);

const lensEmbeddableComponent = jest.fn((props: { attributes?: unknown }) => (
  <div data-test-subj="mockLensEmbeddable">{JSON.stringify(props.attributes)}</div>
));
const httpGet = jest.fn();
const dataViewsCreate = jest.fn();
const updateMutateAsync = jest.fn();

const parsedConfig = {
  name: 'quality monitor',
  indexPattern: 'traces-agent_builder.otel-default',
  extraEsqlWhere: 'attributes.service.name == "agent"',
  windowMinutes: 60,
  lagMinutes: 15,
  maxTracesPerRun: 25,
  every: '1h',
  evaluators: [{ name: 'correctness', version: '1.0.0' }],
  connectorId: 'connector-1',
};

const renderPage = () => {
  const history = createMemoryHistory({ initialEntries: ['/online/workflow-1'] });
  return render(
    <Router history={history}>
      <Route path="/online/:workflowId">
        <OnlineEvalDetailPage />
      </Route>
    </Router>
  );
};

describe('OnlineEvalDetailPage', () => {
  beforeEach(() => {
    mockedUseKibana.mockReturnValue({
      services: {
        http: { get: httpGet },
        lens: { EmbeddableComponent: lensEmbeddableComponent },
        dataViews: { create: dataViewsCreate },
      },
    } as unknown as ReturnType<typeof useKibana>);

    mockedUseEvalsPermissions.mockReturnValue({ canRead: true, canManage: true });
    mockedUseEvalsTraceFetcher.mockReturnValue(jest.fn());
    mockedUseOnlineEvalWorkflow.mockReturnValue({
      data: {
        id: 'workflow-1',
        name: '[online-eval] quality monitor',
        enabled: true,
        yaml: 'version: "1"',
        parsedConfig,
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useOnlineEvalWorkflow>);
    mockedUseToggleOnlineEvalWorkflow.mockReturnValue({
      mutate: jest.fn(),
      isLoading: false,
    } as unknown as ReturnType<typeof useToggleOnlineEvalWorkflow>);
    mockedUseDeleteOnlineEvalWorkflow.mockReturnValue({
      mutate: jest.fn(),
      isLoading: false,
    } as unknown as ReturnType<typeof useDeleteOnlineEvalWorkflow>);
    mockedUseUpdateOnlineEvalWorkflow.mockReturnValue({
      mutateAsync: updateMutateAsync,
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useUpdateOnlineEvalWorkflow>);
    mockedUseModelConnectors.mockReturnValue({
      connectors: [{ id: 'connector-1', name: 'Default connector' }],
      isLoading: false,
      error: null,
    });
    dataViewsCreate.mockResolvedValue({
      id: 'online-scores-data-view',
    });
    httpGet.mockImplementation(async (url: string) => {
      if (url === EVALS_ONLINE_SCORES_URL) {
        return {
          total: 1,
          data: [
            {
              '@timestamp': '2026-07-03T14:00:00.000Z',
              monitor: { id: 'workflow-1', name: '[online-eval] quality monitor' },
              trace_id: 'trace-123',
              evaluator: { name: 'correctness', version: '1.0.0', kind: 'llm' },
              score: {
                name: 'factuality',
                value: 0.9,
                label: 'pass',
                explanation: 'The answer matches the expected output.',
              },
            },
          ],
        };
      }

      return {
        evaluators: [
          {
            name: 'correctness',
            version: '1.0.0',
            kind: 'llm',
          },
        ],
      };
    });
    updateMutateAsync.mockReset();
    updateMutateAsync.mockResolvedValue(undefined);
    lensEmbeddableComponent.mockClear();
  });

  it('passes monitor.id filter to both Lens panels', async () => {
    renderPage();

    await waitFor(() => {
      expect(lensEmbeddableComponent).toHaveBeenCalledTimes(2);
    });

    const firstLensProps = lensEmbeddableComponent.mock.calls[0]?.[0] as {
      attributes: { query: { expression: string } };
    };
    const secondLensProps = lensEmbeddableComponent.mock.calls[1]?.[0] as {
      attributes: { query: { expression: string } };
    };

    expect(firstLensProps).toBeDefined();
    expect(secondLensProps).toBeDefined();
    expect(firstLensProps.attributes.query.expression).toBe('monitor.id: "workflow-1"');
    expect(secondLensProps.attributes.query.expression).toBe('monitor.id: "workflow-1"');
  });

  it('renders rows from the online scores route response', async () => {
    renderPage();

    await waitFor(() => {
      expect(httpGet).toHaveBeenCalledWith(EVALS_ONLINE_SCORES_URL, {
        query: {
          monitor_id: 'workflow-1',
          page: 1,
          per_page: 25,
        },
        version: API_VERSIONS.internal.v1,
      });
    });

    expect(await screen.findByText('trace-123')).toBeInTheDocument();
    expect(screen.getByText('correctness@1.0.0')).toBeInTheDocument();
    expect(screen.getByText('factuality')).toBeInTheDocument();
    expect(screen.getByText('Scores and traces')).toBeInTheDocument();
    expect(screen.getByText('Score trends')).toBeInTheDocument();
  });

  it('opens the trace waterfall flyout when trace id is clicked', async () => {
    renderPage();

    fireEvent.click(await screen.findByText('trace-123'));

    expect(await screen.findByText('Trace waterfall trace-123')).toBeInTheDocument();
  });

  it('does not show the bottom bar when settings are pristine', async () => {
    renderPage();

    await screen.findByTestId('onlineEvalDetailEverySelect');
    expect(screen.queryByTestId('onlineEvalDetailBottomBar')).not.toBeInTheDocument();
  });

  it('shows bottom bar after editing and cancel resets draft', async () => {
    renderPage();

    const windowInput = (await screen.findByTestId(
      'onlineEvalDetailWindowInput'
    )) as HTMLInputElement;
    fireEvent.change(windowInput, { target: { value: '90' } });

    expect(await screen.findByTestId('onlineEvalDetailBottomBar')).toBeInTheDocument();
    expect(windowInput.value).toBe('90');

    fireEvent.click(screen.getByTestId('onlineEvalDetailCancelButton'));
    expect(
      ((await screen.findByTestId('onlineEvalDetailWindowInput')) as HTMLInputElement).value
    ).toBe('60');
    expect(screen.queryByTestId('onlineEvalDetailBottomBar')).not.toBeInTheDocument();
  });

  it('saves edited settings through update mutation', async () => {
    renderPage();

    fireEvent.change(await screen.findByTestId('onlineEvalDetailEverySelect'), {
      target: { value: '5m' },
    });
    fireEvent.click(await screen.findByTestId('onlineEvalDetailSaveButton'));

    await waitFor(() => {
      expect(updateMutateAsync).toHaveBeenCalledWith({
        workflowId: 'workflow-1',
        config: expect.objectContaining({
          every: '5m',
        }),
      });
    });
  });

  it('shows active callout when workflow is enabled', async () => {
    renderPage();
    expect(await screen.findByTestId('onlineEvalDetailActiveCallout')).toBeInTheDocument();
  });

  it('hides active callout when workflow is disabled', async () => {
    mockedUseOnlineEvalWorkflow.mockReturnValue({
      data: {
        id: 'workflow-1',
        name: '[online-eval] quality monitor',
        enabled: false,
        yaml: 'version: "1"',
        parsedConfig,
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useOnlineEvalWorkflow>);

    renderPage();
    expect(screen.queryByTestId('onlineEvalDetailActiveCallout')).not.toBeInTheDocument();
  });

  it('disables editing and shows lock callout when user cannot manage', async () => {
    mockedUseEvalsPermissions.mockReturnValue({ canRead: true, canManage: false });

    renderPage();

    expect(await screen.findByTestId('onlineEvalDetailNoPermissionCallout')).toBeInTheDocument();
    expect(await screen.findByTestId('onlineEvalDetailEverySelect')).toBeDisabled();
    expect(await screen.findByTestId('onlineEvalDetailWindowInput')).toBeDisabled();
    expect(await screen.findByTestId('onlineEvalDetailExtraWhereInput')).toBeDisabled();
  });

  it('keeps the configured connector selected when it is no longer selectable', async () => {
    mockedUseModelConnectors.mockReturnValue({
      connectors: [{ id: 'connector-2', name: 'Another connector' }],
      isLoading: false,
      error: null,
    });

    renderPage();

    const connectorCombo = await screen.findByTestId('onlineEvalDetailConnectorCombo');
    expect(connectorCombo.querySelector('input')).toHaveValue('connector-1');
  });
});
