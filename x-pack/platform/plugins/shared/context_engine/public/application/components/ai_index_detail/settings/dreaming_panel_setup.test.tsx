/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { coreMock } from '@kbn/core/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { createMockWorkflowsCapabilities } from '@kbn/workflows-ui/mocks';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { DREAMING_TEMPLATES_PATH } from '../../../../../common/constants';
import type { GetAiIndexDreamingResponse } from '../../../../../common/dreaming';
import type { AiIndexHttpItem } from '../../../../../common/http_api/ai_indices';
import type { LatestWorkflowExecution } from '../../../hooks/use_latest_workflow_execution';
import { DreamingPanel } from './dreaming_panel';

const mockUseLatestWorkflowExecution = jest.fn(
  (): LatestWorkflowExecution => ({
    executions: [],
    unavailableWorkflowIds: [],
    isRunning: false,
    activeExecutionId: undefined,
    isError: false,
    isLoading: false,
  })
);
jest.mock('../../../hooks/use_latest_workflow_execution', () => ({
  useLatestWorkflowExecution: () => mockUseLatestWorkflowExecution(),
}));
jest.mock('../../../hooks/use_workflow_summaries', () => ({
  useWorkflowSummaries: () => ({
    summaries: new Map(),
    isLoading: false,
    missingReadPrivilege: false,
  }),
}));
jest.mock('../../../hooks/use_run_dreaming', () => ({
  useRunDreaming: () => ({ runDreaming: jest.fn(), isLoading: false }),
}));
const mockUseWorkflowsCapabilities = jest.fn(() => createMockWorkflowsCapabilities());
jest.mock('@kbn/workflows-ui', () => ({
  ...jest.requireActual('@kbn/workflows-ui'),
  useWorkflowsCapabilities: () => mockUseWorkflowsCapabilities(),
}));

const SUPPORT_ENTITIES = {
  nodes: [{ type: 'issue' }, { type: 'product_area' }],
};

const CUSTOMER_SUPPORT_TEMPLATE = {
  id: 'customer_support',
  name: 'Customer support',
  description: 'Tickets.',
  summary: 'Support.',
  rationale: 'Issues.',
  dreaming: { facts: [{ type: 'solution' }], entities: SUPPORT_ENTITIES },
};

const aiIndex: AiIndexHttpItem = {
  id: 'tickets',
  managed: false,
  dest: { type: 'index', value: 'ai-index-idx-tickets' },
  automations: [],
  sources: [],
  traces: [],
  date_created: '2026-11-01T00:00:00.000Z',
  date_modified: '2026-11-01T00:00:00.000Z',
};

const notSetUpDreaming: GetAiIndexDreamingResponse = {
  dreaming: { enabled: false },
  workflow_ids: [],
};

const appliedDreaming: GetAiIndexDreamingResponse = {
  dreaming: {
    enabled: true,
    instructions: 'Support.',
    facts: [{ type: 'solution' }],
  },
  workflow_ids: ['wf-dreaming'],
};

const renderSetupPanel = ({
  putDeferred,
}: { putDeferred?: { promise: Promise<GetAiIndexDreamingResponse> } } = {}) => {
  const services = coreMock.createStart();
  let dreamingGet = notSetUpDreaming;
  services.http.get.mockImplementation((async (path: string) => {
    if (path.endsWith('/dreaming')) return dreamingGet;
    if (path === DREAMING_TEMPLATES_PATH) return { templates: [CUSTOMER_SUPPORT_TEMPLATE] };
    throw new Error(`unexpected GET ${path}`);
  }) as typeof services.http.get);
  if (putDeferred) {
    services.http.put.mockImplementation(async () => {
      const result = await putDeferred.promise;
      dreamingGet = result;
      return result;
    });
  } else {
    services.http.put.mockImplementation(async () => {
      dreamingGet = appliedDreaming;
      return appliedDreaming;
    });
  }
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={services}>
          <QueryClientProvider client={queryClient}>
            <DreamingPanel aiIndex={aiIndex} />
          </QueryClientProvider>
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );
  return services;
};

describe('DreamingPanel setup (real dreaming hooks)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWorkflowsCapabilities.mockReturnValue(createMockWorkflowsCapabilities());
  });

  it('turns dreaming on from the setup form and shows the editor', async () => {
    const services = renderSetupPanel();
    await waitFor(() =>
      expect(screen.getByTestId('contextAiIndexDreamingSetUpToggle')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId('contextAiIndexDreamingSetUpToggle'));
    await waitFor(() =>
      expect(screen.getByTestId('contextAiIndexDreamingSetupSave')).toBeInTheDocument()
    );
    fireEvent.click(screen.getByTestId('contextAiIndexDreamingSetupSave'));

    await waitFor(() =>
      expect(screen.getByTestId('contextAiIndexDreamingInstructions')).toBeInTheDocument()
    );
    const [, { body }] = services.http.put.mock.calls[0] as unknown as [string, { body: string }];
    expect(JSON.parse(body)).toEqual(
      expect.objectContaining({
        enabled: true,
        facts: [{ type: 'solution' }],
        instructions: 'Support.',
      })
    );
  });

  it('disables the setup toggle and discard while apply is pending', async () => {
    let resolvePut!: (value: GetAiIndexDreamingResponse) => void;
    const putPromise = new Promise<GetAiIndexDreamingResponse>((resolve) => {
      resolvePut = resolve;
    });
    renderSetupPanel({ putDeferred: { promise: putPromise } });
    await waitFor(() =>
      expect(screen.getByTestId('contextAiIndexDreamingSetUpToggle')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId('contextAiIndexDreamingSetUpToggle'));
    await waitFor(() =>
      expect(screen.getByTestId('contextAiIndexDreamingSetupSave')).toBeInTheDocument()
    );
    fireEvent.click(screen.getByTestId('contextAiIndexDreamingSetupSave'));

    await waitFor(() => {
      expect(screen.getByTestId('contextAiIndexDreamingSetUpToggle')).toBeDisabled();
      expect(screen.getByTestId('contextAiIndexDreamingSetupDiscard')).toBeDisabled();
    });

    resolvePut(appliedDreaming);
    await waitFor(() =>
      expect(screen.getByTestId('contextAiIndexDreamingInstructions')).toBeInTheDocument()
    );
  });
});
