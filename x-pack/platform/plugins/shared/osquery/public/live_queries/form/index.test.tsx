/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { EuiProvider } from '@elastic/eui';

import type { OsqueryCapabilities } from '../../__test_helpers__/create_mock_kibana_services';
import { ROLE_CAPABILITIES } from '../../__test_helpers__/create_mock_kibana_services';

const mockUseKibana = jest.fn();
const mockMutateAsync = jest.fn();
const mockResetMutation = jest.fn();
const mockUsePacks = jest.fn();

jest.mock('../../common/lib/kibana', () => ({
  ...jest.requireActual('../../common/lib/kibana'),
  useKibana: () => mockUseKibana(),
}));

jest.mock('../use_create_live_query_action', () => ({
  useCreateLiveQuery: () => ({
    data: undefined,
    isLoading: false,
    mutateAsync: mockMutateAsync,
    reset: mockResetMutation,
  }),
}));

jest.mock('../../actions/use_live_query_details', () => ({
  useLiveQueryDetails: () => ({ data: undefined }),
}));

jest.mock('../../packs/use_packs', () => ({
  usePacks: () => mockUsePacks(),
}));

jest.mock('../../editor', () => ({
  OsqueryEditor: ({ defaultValue }: { defaultValue: string }) => (
    <div data-test-subj="osqueryEditor">{defaultValue}</div>
  ),
}));

jest.mock('../../packs/queries/lazy_ecs_mapping_editor_field', () => ({
  ECSMappingEditorField: () => <div data-test-subj="ecsMappingEditor">ECS Mapping</div>,
}));

jest.mock('../../saved_queries/saved_queries_dropdown', () => ({
  SavedQueriesDropdown: () => <div data-test-subj="savedQueriesDropdown">Saved Queries</div>,
}));

jest.mock('../../form/timeout_field', () => ({
  TimeoutField: () => <div data-test-subj="timeoutField">Timeout</div>,
}));

jest.mock('./agents_table_field', () => ({
  AgentsTableField: () => <div data-test-subj="agentsTableField" />,
}));

jest.mock('./query_pack_selectable', () => ({
  QueryPackSelectable: () => <div data-test-subj="queryPackSelectable" />,
}));

jest.mock('./pack_queries_status_table', () => ({
  PackQueriesStatusTable: () => <div data-test-subj="packQueriesStatusTable" />,
}));

jest.mock('../../shared_components/osquery_response_action_type/pack_field_wrapper', () => ({
  PackFieldWrapper: ({ submitButtonContent }: { submitButtonContent: React.ReactNode }) => (
    <div data-test-subj="packFieldWrapper">{submitButtonContent}</div>
  ),
}));

// Import after all mocks are registered (jest.mock is hoisted above imports by babel-jest)
import { LiveQueryForm } from '.';
import { ExperimentalFeaturesProvider } from '../../common/experimental_features_context';

const AGENT_SELECTION = {
  agents: ['agent-1'],
  allAgentsSelected: false,
  platformsSelected: [],
  policiesSelected: [],
};

const setupKibana = (capabilities: OsqueryCapabilities) => {
  mockUseKibana.mockReturnValue({
    services: {
      application: {
        capabilities: {
          osquery: capabilities,
        },
      },
    },
  });
};

const renderForm = (props: React.ComponentProps<typeof LiveQueryForm>) =>
  render(
    <EuiProvider>
      <IntlProvider locale="en">
        <ExperimentalFeaturesProvider>
          <LiveQueryForm {...props} />
        </ExperimentalFeaturesProvider>
      </IntlProvider>
    </EuiProvider>
  );

const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

describe('LiveQueryForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMutateAsync.mockResolvedValue({});
    mockUsePacks.mockReturnValue({ data: { data: [] }, isFetched: true });
  });

  describe('submit payload', () => {
    describe.each([
      ['admin', ROLE_CAPABILITIES.admin],
      ['t1_analyst', ROLE_CAPABILITIES.t1_analyst],
    ])('as %s', (_role, capabilities) => {
      beforeEach(() => {
        setupKibana(capabilities);
      });

      it('should include the default query when the query field is hidden', async () => {
        renderForm({
          queryField: false,
          hideAgentsField: true,
          formType: 'simple',
          defaultValue: {
            agentSelection: AGENT_SELECTION,
            query: 'select * from uptime;',
          },
        });

        expect(screen.queryByTestId('queryPackSelectable')).not.toBeInTheDocument();

        submit();

        await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledTimes(1));
        expect(mockMutateAsync.mock.calls[0][0]).toEqual(
          expect.objectContaining({
            agentSelection: AGENT_SELECTION,
            query: 'select * from uptime;',
          })
        );
      });

      it('should include the saved query reference and mapping when the query field is hidden', async () => {
        const ecsMapping = { 'host.uptime': { field: 'total_seconds' } };

        renderForm({
          queryField: false,
          hideAgentsField: true,
          formType: 'simple',
          defaultValue: {
            agentSelection: AGENT_SELECTION,
            query: 'select * from uptime;',
            savedQueryId: 'uptime-saved-query',
            ecs_mapping: ecsMapping,
            timeout: 120,
          },
        });

        submit();

        await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledTimes(1));
        expect(mockMutateAsync.mock.calls[0][0]).toEqual({
          agentSelection: AGENT_SELECTION,
          query: 'select * from uptime;',
          saved_query_id: 'uptime-saved-query',
          ecs_mapping: ecsMapping,
          timeout: 120,
        });
      });
    });

    it('should send only the pack reference in pack mode', async () => {
      setupKibana(ROLE_CAPABILITIES.t1_analyst);
      mockUsePacks.mockReturnValue({
        data: { data: [{ saved_object_id: 'pack-1', name: 'Pack 1' }] },
        isFetched: true,
      });

      renderForm({
        hideAgentsField: true,
        defaultValue: {
          agentSelection: AGENT_SELECTION,
          packId: 'pack-1',
        },
      });

      expect(screen.getByTestId('packFieldWrapper')).toBeInTheDocument();

      submit();

      await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledTimes(1));
      expect(mockMutateAsync.mock.calls[0][0]).toEqual({
        agentSelection: AGENT_SELECTION,
        pack_id: 'pack-1',
      });
    });
  });
});
