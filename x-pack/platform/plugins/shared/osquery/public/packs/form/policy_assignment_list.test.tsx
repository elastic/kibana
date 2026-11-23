/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { EuiProvider } from '@elastic/eui';
import { PolicyAssignmentList } from './policy_assignment_list';

const mockGetUrlForApp = jest.fn(
  (appId: string, opts: { path: string }) => `/app/${appId}${opts.path}`
);

let mockCapabilities: Record<string, Record<string, boolean>> = {};

jest.mock('../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: {
      application: {
        getUrlForApp: mockGetUrlForApp,
        capabilities: mockCapabilities,
      },
    },
  }),
}));

const mockAgentPoliciesById = {
  'policy-1': { name: 'Alpha Policy', agents: 5, id: 'policy-1', description: 'Linux servers' },
  'policy-2': {
    name: 'Beta Policy',
    agents: 10,
    id: 'policy-2',
    description: 'Windows workstations',
  },
  'policy-3': { name: 'Gamma Policy', agents: 3, id: 'policy-3', description: 'macOS laptops' },
};

const mockUseAgentPolicies = jest.fn();

jest.mock('../../agent_policies', () => ({
  useAgentPolicies: () => mockUseAgentPolicies(),
}));

jest.mock('@kbn/fleet-plugin/public', () => ({
  pagePathGetters: {
    // Mirrors Fleet pagePathGetters: path segment is `/policies/${id}` (not `/fleet/policies/...`).
    policy_details: ({ policyId }: { policyId: string }) => ['', `/policies/${policyId}`],
  },
}));

jest.mock('@kbn/fleet-plugin/common', () => ({
  PLUGIN_ID: 'fleet',
}));

interface WrapperProps {
  defaultValues?: { policy_ids: string[]; shards?: Record<string, number> };
  isReadOnly?: boolean;
  onFormChange?: (values: { policy_ids: string[]; shards?: Record<string, number> }) => void;
  receivingPolicyIds?: string[];
}

const FormWrapper: React.FC<WrapperProps> = ({
  defaultValues = { policy_ids: [], shards: {} },
  isReadOnly = false,
  onFormChange,
  receivingPolicyIds,
}) => {
  const methods = useForm<{ policy_ids: string[]; shards: Record<string, number> }>({
    defaultValues: {
      shards: {},
      ...defaultValues,
    },
  });
  const { getValues, watch } = methods;
  const policyIds = watch('policy_ids');

  React.useEffect(() => {
    onFormChange?.(getValues());
  }, [policyIds, onFormChange, getValues]);

  return (
    <EuiProvider>
      <IntlProvider locale="en">
        <FormProvider {...methods}>
          <PolicyAssignmentList isReadOnly={isReadOnly} receivingPolicyIds={receivingPolicyIds} />
        </FormProvider>
      </IntlProvider>
    </EuiProvider>
  );
};

describe('PolicyAssignmentList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCapabilities = { fleetv2: { agent_policies_read: true } };
    mockUseAgentPolicies.mockReturnValue({
      data: { agentPoliciesById: mockAgentPoliciesById },
      isFetching: false,
      isError: false,
    });
  });

  describe('shared integrations', () => {
    const groupName = 'Select shared integration Shared hosts, 2 agent policies';
    const sharedData = {
      agentPoliciesById: mockAgentPoliciesById,
      groupsByPackagePolicyId: {
        shared: { id: 'shared', name: 'Shared hosts', policyIds: ['policy-1', 'policy-2'] },
      },
      groupIdByPolicyId: { 'policy-1': 'shared', 'policy-2': 'shared' },
    };

    beforeEach(() => {
      mockUseAgentPolicies.mockReturnValue({ data: sharedData, isFetching: false, isError: false });
    });

    const openSharedPolicies = async () => {
      fireEvent.click(screen.getByTestId('policyAssignmentSharedPoliciesBadge'));

      return screen.findByTestId('policyAssignmentSharedPoliciesPopover');
    };

    it.each([false, true])(
      'explains a partial saved selection (read-only: %s)',
      async (isReadOnly) => {
        const onFormChange = jest.fn();
        render(
          <FormWrapper
            defaultValues={{ policy_ids: ['policy-1'] }}
            isReadOnly={isReadOnly}
            onFormChange={onFormChange}
          />
        );

        expect(screen.getByRole('checkbox', { name: groupName })).toBeChecked();
        expect(screen.getByTestId('policyAssignmentCount')).toHaveTextContent('2 of 3 selected');
        await openSharedPolicies();
        const marker = await screen.findByText('Included via shared integration');
        expect(marker.closest('li')).toHaveTextContent('Beta Policy');
        expect(marker.closest('li')).not.toHaveTextContent('Alpha Policy');
        expect(screen.getByTestId('policyAssignmentSharedIntegrationCallout')).toHaveTextContent(
          'share an integration with a selected agent policy: Beta Policy. Saving does not add them to this pack’s agent policies.'
        );
        expect(onFormChange).toHaveBeenLastCalledWith({ policy_ids: ['policy-1'], shards: {} });

        if (!isReadOnly) {
          fireEvent.click(screen.getByTestId('policyAssignmentUnselectAll'));
          expect(screen.getByRole('checkbox', { name: groupName })).not.toBeChecked();
          expect(screen.queryByText('Included via shared integration')).not.toBeInTheDocument();
          expect(
            screen.queryByTestId('policyAssignmentSharedIntegrationCallout')
          ).not.toBeInTheDocument();
          expect(onFormChange).toHaveBeenLastCalledWith({ policy_ids: [], shards: {} });
        }
      }
    );

    it('shows one marker per member: "Included" for a partial selection, "Receives" only for drift', async () => {
      const { unmount } = render(
        <FormWrapper
          defaultValues={{ policy_ids: ['policy-1'] }}
          receivingPolicyIds={['policy-2']}
        />
      );
      await openSharedPolicies();
      expect(await screen.findByText('Included via shared integration')).toBeInTheDocument();
      expect(
        screen.queryByText('Receives this pack via shared integration')
      ).not.toBeInTheDocument();
      unmount();

      render(
        <FormWrapper
          defaultValues={{ policy_ids: ['policy-3'] }}
          receivingPolicyIds={['policy-1', 'policy-2']}
        />
      );
      expect(screen.getByRole('checkbox', { name: groupName })).not.toBeChecked();
      await openSharedPolicies();
      expect(await screen.findAllByText('Receives this pack via shared integration')).toHaveLength(
        2
      );
      expect(screen.queryByText('Included via shared integration')).not.toBeInTheDocument();
    });

    it('does not report a shard-assigned member as included via the shared integration', () => {
      render(
        <FormWrapper defaultValues={{ policy_ids: ['policy-2'], shards: { 'policy-1': 10 } }} />
      );

      expect(screen.getByRole('checkbox', { name: groupName })).toBeChecked();
      expect(screen.queryByText('Included via shared integration')).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('policyAssignmentSharedIntegrationCallout')
      ).not.toBeInTheDocument();
    });

    it('renders a shared integration as one row: first policy, +N badge, Shared label, summed agents', async () => {
      render(<FormWrapper />);
      expect(screen.getAllByRole('checkbox')).toHaveLength(2);
      expect(screen.getByRole('checkbox', { name: groupName })).not.toBeChecked();
      const group = screen.getByRole('group', { name: 'Shared integration: Shared hosts' });
      expect(within(group).getByText('Alpha Policy')).toBeInTheDocument();
      expect(within(group).queryByText('Beta Policy')).not.toBeInTheDocument();
      expect(within(group).getByTestId('policyAssignmentSharedPoliciesBadge')).toHaveTextContent(
        '+1'
      );

      const cells = within(group.closest('tr') as HTMLElement).getAllByRole('cell');
      expect(cells[cells.length - 2]).toHaveTextContent('15 agents');
      expect(
        within(cells[cells.length - 1]).getByTestId('viewPolicy-policy-1')
      ).toBeInTheDocument();
      expect(screen.getByTestId('viewPolicy-policy-3')).toHaveAttribute(
        'href',
        '/app/fleet/policies/policy-3'
      );

      fireEvent.mouseOver(screen.getByTestId('policyAssignmentSharedLabel'));
      expect(
        await screen.findByText(
          'These agent policies share the Osquery Manager integration Shared hosts. Packs are delivered per integration, so they are selected together.'
        )
      ).toBeInTheDocument();
    });

    it('lists every agent policy of the integration with its agents and link in the popover', async () => {
      render(<FormWrapper />);
      const popover = await openSharedPolicies();
      expect(
        within(popover).getByText('Shared integration Shared hosts is used by')
      ).toBeInTheDocument();
      const items = within(popover).getAllByRole('listitem');
      expect(items).toHaveLength(2);
      expect(items[0]).toHaveTextContent(/^Alpha Policy.*5 agents$/);
      expect(items[1]).toHaveTextContent(/^Beta Policy.*10 agents$/);
      expect(within(popover).getByTestId('viewPolicy-policy-2')).toHaveAttribute(
        'href',
        '/app/fleet/policies/policy-2'
      );
    });

    it('selects and unselects all members as a unit and counts agent policies', () => {
      const onFormChange = jest.fn();
      render(<FormWrapper onFormChange={onFormChange} />);
      fireEvent.click(screen.getByRole('checkbox', { name: groupName }));
      expect(onFormChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ policy_ids: ['policy-1', 'policy-2'] })
      );
      expect(screen.getByTestId('policyAssignmentCount')).toHaveTextContent(
        '2 of 3 selected | 15 agents enrolled'
      );
      fireEvent.click(screen.getByRole('checkbox', { name: groupName }));
      expect(onFormChange).toHaveBeenLastCalledWith(expect.objectContaining({ policy_ids: [] }));
      expect(screen.getByTestId('policyAssignmentCount')).toHaveTextContent('0 of 3 selected');
    });

    it('lists members as plain text when the user cannot read Fleet agent policies', async () => {
      mockCapabilities = { fleetv2: { agent_policies_read: false } };
      render(<FormWrapper />);
      const popover = await openSharedPolicies();
      expect(within(popover).getByText('Alpha Policy')).toBeInTheDocument();
      expect(within(popover).getByText('Beta Policy')).toBeInTheDocument();
      expect(within(popover).queryAllByRole('link')).toHaveLength(0);
    });

    it.each(['Alpha', 'Beta', 'Shared hosts'])(
      'searches by %s and keeps the entire group for bulk actions',
      (search) => {
        const onFormChange = jest.fn();
        render(<FormWrapper onFormChange={onFormChange} />);
        fireEvent.change(screen.getByTestId('policyAssignmentSearch'), {
          target: { value: search },
        });
        expect(screen.getByText('Alpha Policy')).toBeInTheDocument();
        expect(screen.getByTestId('policyAssignmentSharedPoliciesBadge')).toHaveTextContent('+1');
        expect(screen.queryByText('Gamma Policy')).not.toBeInTheDocument();
        fireEvent.click(screen.getByTestId('policyAssignmentSelectAll'));
        expect(onFormChange).toHaveBeenLastCalledWith(
          expect.objectContaining({ policy_ids: ['policy-1', 'policy-2'] })
        );
        expect(screen.getByTestId('policyAssignmentCount')).toHaveTextContent('2 of 2 matching');
        fireEvent.click(screen.getByTestId('policyAssignmentUnselectAll'));
        expect(onFormChange).toHaveBeenLastCalledWith(expect.objectContaining({ policy_ids: [] }));
      }
    );

    it('includes groups in Select all and Un-select all', () => {
      render(<FormWrapper />);
      fireEvent.click(screen.getByTestId('policyAssignmentSelectAll'));
      expect(screen.getByRole('checkbox', { name: groupName })).toBeChecked();
      expect(screen.getByRole('checkbox', { name: 'Select policy Gamma Policy' })).toBeChecked();
      expect(screen.getByTestId('policyAssignmentCount')).toHaveTextContent('3 of 3 selected');
      fireEvent.click(screen.getByTestId('policyAssignmentUnselectAll'));
      screen.getAllByRole('checkbox').forEach((checkbox) => expect(checkbox).not.toBeChecked());
    });

    it('counts a group as one pagination row and never splits its members', () => {
      const extraPolicies = Object.fromEntries(
        Array.from({ length: 10 }, (_, index) => [
          `extra-${index}`,
          { id: `extra-${index}`, name: `A policy ${index}`, agents: 1 },
        ])
      );
      mockUseAgentPolicies.mockReturnValue({
        data: { ...sharedData, agentPoliciesById: { ...mockAgentPoliciesById, ...extraPolicies } },
        isFetching: false,
        isError: false,
      });
      render(<FormWrapper />);
      expect(screen.queryByText('Alpha Policy')).not.toBeInTheDocument();
      fireEvent.click(screen.getByTestId('pagination-button-1'));
      expect(screen.getByText('Alpha Policy')).toBeInTheDocument();
      expect(screen.getAllByRole('checkbox')).toHaveLength(2);
      fireEvent.click(screen.getByRole('checkbox', { name: groupName }));
      // Selecting does not reset the page.
      expect(screen.getByRole('checkbox', { name: groupName })).toBeChecked();
    });

    it('disables group selection and bulk actions in read-only mode while retaining links', () => {
      render(<FormWrapper isReadOnly defaultValues={{ policy_ids: ['policy-1', 'policy-2'] }} />);
      expect(screen.getByRole('checkbox', { name: groupName })).toBeChecked();
      screen.getAllByRole('checkbox').forEach((checkbox) => expect(checkbox).toBeDisabled());
      expect(screen.getByTestId('policyAssignmentSelectAll')).toBeDisabled();
      expect(screen.getByTestId('policyAssignmentUnselectAll')).toBeDisabled();
      expect(screen.getByTestId('viewPolicy-policy-1')).toHaveAttribute(
        'href',
        '/app/fleet/policies/policy-1'
      );
    });
  });

  describe('rendering', () => {
    it('renders all policy rows', () => {
      render(<FormWrapper />);
      expect(screen.getByText('Alpha Policy')).toBeInTheDocument();
      expect(screen.getByText('Beta Policy')).toBeInTheDocument();
      expect(screen.getByText('Gamma Policy')).toBeInTheDocument();
    });

    it('renders empty state when no policies are available', () => {
      mockUseAgentPolicies.mockReturnValue({
        data: { agentPoliciesById: {} },
        isFetching: false,
        isError: false,
      });
      render(<FormWrapper />);
      expect(screen.getByText('No agent policies found')).toBeInTheDocument();
      expect(
        screen.getByText('Create an agent policy in Fleet to assign it to this pack.')
      ).toBeInTheDocument();
    });

    it('shows a loading empty state while the first fetch is in flight', () => {
      mockUseAgentPolicies.mockReturnValue({
        data: { agentPoliciesById: {} },
        isFetching: true,
        isError: false,
      });
      render(<FormWrapper />);

      expect(screen.getByText('Loading agent policies')).toBeInTheDocument();
      expect(screen.queryByText('No agent policies found')).not.toBeInTheDocument();
      expect(
        screen.queryByText('Create an agent policy in Fleet to assign it to this pack.')
      ).not.toBeInTheDocument();
    });

    it('shows an error empty state when the first fetch fails', () => {
      mockUseAgentPolicies.mockReturnValue({
        data: { agentPoliciesById: {} },
        isFetching: false,
        isError: true,
      });
      render(<FormWrapper />);

      expect(screen.getByText('Unable to load agent policies')).toBeInTheDocument();
      expect(screen.queryByText('No agent policies found')).not.toBeInTheDocument();
      expect(
        screen.queryByText('Create an agent policy in Fleet to assign it to this pack.')
      ).not.toBeInTheDocument();
    });

    it('still surfaces a failed fetch when seeded policy_ids produce orphan rows', () => {
      // Orphan rows are synthesized from the form value, so they must not make
      // a failed request look like a settled, complete policy list.
      mockUseAgentPolicies.mockReturnValue({
        data: { agentPoliciesById: {} },
        isFetching: false,
        isError: true,
      });
      render(<FormWrapper defaultValues={{ policy_ids: ['policy-1'] }} />);

      expect(screen.getByTestId('policyAssignmentLoadError')).toBeInTheDocument();
      expect(screen.getByText('policy-1')).toBeInTheDocument();
      // The assignment must not be editable against an incomplete list.
      expect(screen.getByRole('checkbox', { name: 'Select policy policy-1' })).toBeDisabled();
      expect(screen.getByTestId('policyAssignmentUnselectAll')).toBeDisabled();
    });

    it('blocks editing while the first fetch is still in flight', () => {
      mockUseAgentPolicies.mockReturnValue({
        data: { agentPoliciesById: {} },
        isFetching: true,
        isError: false,
      });
      render(<FormWrapper defaultValues={{ policy_ids: ['policy-1'] }} />);

      expect(screen.getByRole('checkbox', { name: 'Select policy policy-1' })).toBeDisabled();
      expect(screen.getByTestId('policyAssignmentSelectAll')).toBeDisabled();
      expect(screen.getByTestId('policyAssignmentUnselectAll')).toBeDisabled();
    });

    it('gives each checkbox a unique accessible name from the policy name', () => {
      render(<FormWrapper />);

      expect(
        screen.getByRole('checkbox', { name: 'Select policy Alpha Policy' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('checkbox', { name: 'Select policy Beta Policy' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('checkbox', { name: 'Select policy Gamma Policy' })
      ).toBeInTheDocument();
    });

    it('uses the orphan policy id as the checkbox accessible name', () => {
      render(<FormWrapper defaultValues={{ policy_ids: ['orphan-policy'] }} />);

      expect(
        screen.getByRole('checkbox', { name: 'Select policy orphan-policy' })
      ).toBeInTheDocument();
    });

    it('renders the field label and help text', () => {
      render(<FormWrapper />);
      expect(screen.getByText('Scheduled agent policies (optional)')).toBeInTheDocument();
      expect(
        screen.getByText('Queries in this pack are scheduled for agents in the selected policies.')
      ).toBeInTheDocument();
    });

    it('sorts rows by name ascending by default', () => {
      mockUseAgentPolicies.mockReturnValue({
        data: {
          agentPoliciesById: {
            'policy-z': { name: 'Zeta Policy', agents: 1, id: 'policy-z', description: '' },
            'policy-a': { name: 'Alpha Policy', agents: 2, id: 'policy-a', description: '' },
          },
        },
        isFetching: false,
        isError: false,
      });
      render(<FormWrapper />);
      const rows = screen.getAllByRole('row').slice(1);
      expect(rows[0]).toHaveTextContent('Alpha Policy');
      expect(rows[1]).toHaveTextContent('Zeta Policy');
    });

    it('renders the policy description next to the name', () => {
      render(<FormWrapper />);
      expect(screen.getByText('Linux servers')).toBeInTheDocument();
      expect(screen.getByText('Windows workstations')).toBeInTheDocument();
      expect(screen.getByText('macOS laptops')).toBeInTheDocument();
    });

    it('renders View policy links for all rows', () => {
      render(<FormWrapper />);
      const links = screen.getAllByText('View policy');
      expect(links).toHaveLength(3);
    });

    it('View policy link targets correct Fleet path', () => {
      render(<FormWrapper />);
      const links = screen.getAllByRole('link', { name: /view policy/i });
      const hrefs = links.map((l) => l.getAttribute('href'));
      expect(hrefs).toContain('/app/fleet/policies/policy-1');
    });

    it('View policy link is present on unselected rows', () => {
      render(<FormWrapper defaultValues={{ policy_ids: ['policy-1'] }} />);
      const links = screen.getAllByText('View policy');
      // 3 rows, all have links regardless of selection
      expect(links).toHaveLength(3);
    });

    it('hides View policy links when the user cannot read Fleet agent policies', () => {
      mockCapabilities = { fleetv2: { agent_policies_read: false } };
      render(<FormWrapper />);

      expect(screen.queryByText('View policy')).not.toBeInTheDocument();
      expect(screen.getByText('Alpha Policy')).toBeInTheDocument();
    });

    it('hides View policy links when Fleet capabilities are missing', () => {
      mockCapabilities = {};
      render(<FormWrapper />);

      expect(screen.queryByText('View policy')).not.toBeInTheDocument();
    });

    it('still marks orphan rows as unavailable without Fleet access', () => {
      mockCapabilities = {};
      render(<FormWrapper defaultValues={{ policy_ids: ['orphan-policy'] }} />);

      expect(screen.getByText('Unavailable')).toBeInTheDocument();
      expect(screen.queryByText('View policy')).not.toBeInTheDocument();
    });
  });

  describe('search', () => {
    it('filters rows by name', () => {
      render(<FormWrapper />);
      const searchInput = screen.getByPlaceholderText('Search policies');
      fireEvent.change(searchInput, { target: { value: 'Alpha' } });
      expect(screen.getByText('Alpha Policy')).toBeInTheDocument();
      expect(screen.queryByText('Beta Policy')).not.toBeInTheDocument();
      expect(screen.queryByText('Gamma Policy')).not.toBeInTheDocument();
    });

    it('shows a search-specific empty state when the filter matches nothing', () => {
      render(<FormWrapper />);
      const searchInput = screen.getByPlaceholderText('Search policies');
      fireEvent.change(searchInput, { target: { value: 'no-such-policy' } });

      expect(screen.getByText('No policies match your search')).toBeInTheDocument();
      // The copy must name every searched field, description included.
      expect(
        screen.getByText(
          'Policies are matched by name or description. Clear or change the search to see the full list.'
        )
      ).toBeInTheDocument();
      // Zero-policies empty copy is only for a successful empty Fleet response.
      expect(screen.queryByText('No agent policies found')).not.toBeInTheDocument();
    });

    it('filters rows by description', () => {
      render(<FormWrapper />);
      const searchInput = screen.getByPlaceholderText('Search policies');
      fireEvent.change(searchInput, { target: { value: 'Windows' } });

      expect(screen.getByText('Beta Policy')).toBeInTheDocument();
      expect(screen.queryByText('Alpha Policy')).not.toBeInTheDocument();
    });

    it('does not match on policy id', () => {
      render(<FormWrapper />);
      const searchInput = screen.getByPlaceholderText('Search policies');
      fireEvent.change(searchInput, { target: { value: 'policy-1' } });

      expect(screen.getByText('No policies match your search')).toBeInTheDocument();
      expect(screen.queryByText('Alpha Policy')).not.toBeInTheDocument();
    });
  });

  describe('selection', () => {
    it('shows selection count including enrolled agents', () => {
      render(<FormWrapper defaultValues={{ policy_ids: ['policy-1', 'policy-2'] }} />);
      const countEl = screen.getByTestId('policyAssignmentCount');
      // policy-1 (5 agents) + policy-2 (10 agents) = 15
      expect(countEl).toHaveTextContent('2 of 3 selected | 15 agents enrolled');
    });

    it('hydrates checkboxes from seeded policy_ids', () => {
      render(<FormWrapper defaultValues={{ policy_ids: ['policy-1', 'policy-2'] }} />);

      expect(screen.getByRole('checkbox', { name: 'Select policy Alpha Policy' })).toBeChecked();
      expect(screen.getByRole('checkbox', { name: 'Select policy Beta Policy' })).toBeChecked();
      expect(
        screen.getByRole('checkbox', { name: 'Select policy Gamma Policy' })
      ).not.toBeChecked();
    });

    it('toggles a single policy id via its row checkbox', () => {
      const handleChange = jest.fn();
      render(<FormWrapper onFormChange={handleChange} />);

      const policy2Checkbox = screen.getByRole('checkbox', {
        name: 'Select policy Beta Policy',
      });
      expect(policy2Checkbox).not.toBeChecked();

      fireEvent.click(policy2Checkbox);
      let lastCall = handleChange.mock.calls[handleChange.mock.calls.length - 1][0];
      expect(lastCall.policy_ids).toEqual(['policy-2']);
      expect(policy2Checkbox).toBeChecked();

      fireEvent.click(policy2Checkbox);
      lastCall = handleChange.mock.calls[handleChange.mock.calls.length - 1][0];
      expect(lastCall.policy_ids).toEqual([]);
      expect(policy2Checkbox).not.toBeChecked();
    });

    it('select all selects every policy', () => {
      const handleChange = jest.fn();
      render(<FormWrapper onFormChange={handleChange} />);
      fireEvent.click(screen.getByTestId('policyAssignmentSelectAll'));
      const lastCall = handleChange.mock.calls[handleChange.mock.calls.length - 1][0];
      expect(lastCall.policy_ids).toHaveLength(3);
      expect(lastCall.policy_ids).toContain('policy-1');
      expect(lastCall.policy_ids).toContain('policy-2');
      expect(lastCall.policy_ids).toContain('policy-3');
    });

    it('un-select all clears every selection', () => {
      const handleChange = jest.fn();
      render(
        <FormWrapper
          defaultValues={{ policy_ids: ['policy-1', 'policy-2', 'policy-3'] }}
          onFormChange={handleChange}
        />
      );
      fireEvent.click(screen.getByTestId('policyAssignmentUnselectAll'));
      const lastCall = handleChange.mock.calls[handleChange.mock.calls.length - 1][0];
      expect(lastCall.policy_ids).toHaveLength(0);
    });

    it('select all with an active search selects only the matching policies', () => {
      // Selecting hidden rows would silently assign the pack to policies the
      // user filtered out, deploying queries to their agents.
      const handleChange = jest.fn();
      render(<FormWrapper onFormChange={handleChange} />);

      const searchInput = screen.getByPlaceholderText('Search policies');
      fireEvent.change(searchInput, { target: { value: 'Alpha' } });

      fireEvent.click(screen.getByTestId('policyAssignmentSelectAll'));
      const lastCall = handleChange.mock.calls[handleChange.mock.calls.length - 1][0];
      expect(lastCall.policy_ids).toEqual(['policy-1']);
    });

    it('select all with an active search keeps selections outside the filter', () => {
      const handleChange = jest.fn();
      render(
        <FormWrapper defaultValues={{ policy_ids: ['policy-3'] }} onFormChange={handleChange} />
      );

      const searchInput = screen.getByPlaceholderText('Search policies');
      fireEvent.change(searchInput, { target: { value: 'Alpha' } });
      fireEvent.click(screen.getByTestId('policyAssignmentSelectAll'));

      const lastCall = handleChange.mock.calls[handleChange.mock.calls.length - 1][0];
      expect(lastCall.policy_ids).toContain('policy-1');
      expect(lastCall.policy_ids).toContain('policy-3');
      expect(lastCall.policy_ids).toHaveLength(2);
    });

    it('un-select all with an active search clears only the matching policies', () => {
      const handleChange = jest.fn();
      render(
        <FormWrapper
          defaultValues={{ policy_ids: ['policy-1', 'policy-3'] }}
          onFormChange={handleChange}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search policies');
      fireEvent.change(searchInput, { target: { value: 'Alpha' } });
      fireEvent.click(screen.getByTestId('policyAssignmentUnselectAll'));

      const lastCall = handleChange.mock.calls[handleChange.mock.calls.length - 1][0];
      expect(lastCall.policy_ids).toEqual(['policy-3']);
    });

    it('labels the bulk actions as scoped while a search is active', () => {
      render(<FormWrapper />);

      expect(screen.getByTestId('policyAssignmentSelectAll')).toHaveTextContent('Select all');
      expect(screen.getByTestId('policyAssignmentSelectAll')).not.toHaveTextContent('matching');

      fireEvent.change(screen.getByPlaceholderText('Search policies'), {
        target: { value: 'Alpha' },
      });

      expect(screen.getByTestId('policyAssignmentSelectAll')).toHaveTextContent(
        'Select all matching'
      );
      expect(screen.getByTestId('policyAssignmentUnselectAll')).toHaveTextContent(
        'Un-select all matching'
      );
    });

    it('selection survives filtering then clearing filter', () => {
      const handleChange = jest.fn();
      render(
        <FormWrapper
          defaultValues={{ policy_ids: ['policy-1', 'policy-2'] }}
          onFormChange={handleChange}
        />
      );
      const searchInput = screen.getByPlaceholderText('Search policies');
      // Filter out policy-1 and policy-2
      fireEvent.change(searchInput, { target: { value: 'Gamma' } });
      // Clear filter
      fireEvent.change(searchInput, { target: { value: '' } });
      // Form value should still have both originally-selected policies
      const lastCall = handleChange.mock.calls[handleChange.mock.calls.length - 1][0];
      expect(lastCall.policy_ids).toContain('policy-1');
      expect(lastCall.policy_ids).toContain('policy-2');
    });

    it('selection persists across real page navigation (form value not pruned)', () => {
      // EUI's built-in table selection would prune off-page rows; our form-owned
      // checkboxes must keep policy_ids when the selected row leaves the page.
      const manyPolicies = Object.fromEntries(
        Array.from({ length: 11 }, (_, i) => {
          const id = `policy-${String(i + 1).padStart(2, '0')}`;

          return [
            id,
            {
              name: `Policy ${String(i + 1).padStart(2, '0')}`,
              agents: i + 1,
              id,
              description: '',
            },
          ];
        })
      );
      mockUseAgentPolicies.mockReturnValue({
        data: { agentPoliciesById: manyPolicies },
        isFetching: false,
        isError: false,
      });

      const handleChange = jest.fn();
      render(
        <FormWrapper defaultValues={{ policy_ids: ['policy-01'] }} onFormChange={handleChange} />
      );

      const page1Checkbox = screen.getByRole('checkbox', {
        name: 'Select policy Policy 01',
      });
      expect(page1Checkbox).toBeChecked();

      // initialPageSize is 10 — page 2 holds Policy 11
      fireEvent.click(screen.getByTestId('pagination-button-1'));
      expect(
        screen.queryByRole('checkbox', { name: 'Select policy Policy 01' })
      ).not.toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: 'Select policy Policy 11' })).toBeInTheDocument();

      const afterPageChange = handleChange.mock.calls[handleChange.mock.calls.length - 1][0];
      expect(afterPageChange.policy_ids).toEqual(['policy-01']);

      fireEvent.click(screen.getByTestId('pagination-button-0'));
      expect(screen.getByRole('checkbox', { name: 'Select policy Policy 01' })).toBeChecked();
      const afterReturn = handleChange.mock.calls[handleChange.mock.calls.length - 1][0];
      expect(afterReturn.policy_ids).toEqual(['policy-01']);
    });

    it('stays on the current page when a checkbox is toggled there', () => {
      // `EuiInMemoryTable` resets to page 1 whenever the `items` reference
      // changes, so a toggle must not rebuild the row array.
      const manyPolicies = Object.fromEntries(
        Array.from({ length: 11 }, (_, i) => {
          const id = `policy-${String(i + 1).padStart(2, '0')}`;

          return [
            id,
            { name: `Policy ${String(i + 1).padStart(2, '0')}`, agents: 1, id, description: '' },
          ];
        })
      );
      mockUseAgentPolicies.mockReturnValue({
        data: { agentPoliciesById: manyPolicies },
        isFetching: false,
        isError: false,
      });

      render(<FormWrapper />);

      fireEvent.click(screen.getByTestId('pagination-button-1'));
      const page2Checkbox = screen.getByRole('checkbox', { name: 'Select policy Policy 11' });

      fireEvent.click(page2Checkbox);

      expect(screen.getByRole('checkbox', { name: 'Select policy Policy 11' })).toBeChecked();
      expect(
        screen.queryByRole('checkbox', { name: 'Select policy Policy 01' })
      ).not.toBeInTheDocument();
    });

    it('excludes shard-targeted policies from the selectable total', () => {
      render(<FormWrapper defaultValues={{ policy_ids: [], shards: { 'policy-2': 50 } }} />);

      expect(screen.getByTestId('policyAssignmentCount')).toHaveTextContent('0 of 2 selected');
    });

    it('explains why a shard-targeted policy cannot be selected', () => {
      render(<FormWrapper defaultValues={{ policy_ids: [], shards: { 'policy-2': 50 } }} />);

      expect(screen.getByTestId('shardAssignedTooltip-policy-2')).toBeInTheDocument();
      expect(screen.queryByTestId('shardAssignedTooltip-policy-1')).not.toBeInTheDocument();
    });

    it('exposes the shard explanation on a focusable, named trigger', () => {
      // The checkbox itself is disabled and therefore unfocusable, so the
      // reason must be reachable without it.
      render(<FormWrapper defaultValues={{ policy_ids: [], shards: { 'policy-2': 50 } }} />);

      const trigger = screen
        .getByTestId('shardAssignedTooltip-policy-2')
        .querySelector('[tabindex="0"]');

      expect(trigger).not.toBeNull();
      // Kibana's Jest environment stubs EUI icons and renders `aria-label` as
      // the stub's text content, so the name is asserted on the trigger itself.
      expect(trigger).toHaveTextContent('Why Beta Policy cannot be selected');
    });

    it('does not add a shard policy id via checkbox', () => {
      const handleChange = jest.fn();
      render(
        <FormWrapper
          defaultValues={{ policy_ids: [], shards: { 'policy-2': 50 } }}
          onFormChange={handleChange}
        />
      );

      const policy2Checkbox = screen
        .getAllByRole('checkbox')
        .find((cb) => cb.getAttribute('id') === 'policy-checkbox-policy-2');
      expect(policy2Checkbox).toBeDefined();
      expect(policy2Checkbox).toBeDisabled();
      expect(policy2Checkbox).not.toBeChecked();

      fireEvent.click(policy2Checkbox!);

      const lastCall = handleChange.mock.calls[handleChange.mock.calls.length - 1][0];
      expect(lastCall.policy_ids).not.toContain('policy-2');
    });

    it('does not add shard policy ids via Select all', () => {
      const handleChange = jest.fn();
      render(
        <FormWrapper
          defaultValues={{ policy_ids: [], shards: { 'policy-2': 50 } }}
          onFormChange={handleChange}
        />
      );

      fireEvent.click(screen.getByTestId('policyAssignmentSelectAll'));
      const lastCall = handleChange.mock.calls[handleChange.mock.calls.length - 1][0];
      expect(lastCall.policy_ids).toContain('policy-1');
      expect(lastCall.policy_ids).toContain('policy-3');
      expect(lastCall.policy_ids).not.toContain('policy-2');
      expect(lastCall.policy_ids).toHaveLength(2);
    });

    it('allows unchecking a shard id already present in policy_ids', () => {
      const handleChange = jest.fn();
      render(
        <FormWrapper
          defaultValues={{
            policy_ids: ['policy-1', 'policy-2'],
            shards: { 'policy-2': 50 },
          }}
          onFormChange={handleChange}
        />
      );

      const policy2Checkbox = screen
        .getAllByRole('checkbox')
        .find((cb) => cb.getAttribute('id') === 'policy-checkbox-policy-2');
      expect(policy2Checkbox).toBeChecked();
      expect(policy2Checkbox).not.toBeDisabled();

      fireEvent.click(policy2Checkbox!);

      const lastCall = handleChange.mock.calls[handleChange.mock.calls.length - 1][0];
      expect(lastCall.policy_ids).toContain('policy-1');
      expect(lastCall.policy_ids).not.toContain('policy-2');
    });

    it('does not link an orphan row to a Fleet page that cannot exist', () => {
      // The id is absent from Fleet, so a policy-details link is guaranteed to
      // land on a not-found page.
      render(<FormWrapper defaultValues={{ policy_ids: ['policy-1', 'orphan-policy'] }} />);

      expect(screen.queryByTestId('viewPolicy-orphan-policy')).not.toBeInTheDocument();
      expect(screen.getByTestId('viewPolicy-policy-1')).toBeInTheDocument();
    });

    it('explains that an orphan policy is unavailable', () => {
      render(<FormWrapper defaultValues={{ policy_ids: ['orphan-policy'] }} />);

      expect(screen.getByText('Unavailable')).toBeInTheDocument();

      const trigger = screen
        .getByTestId('policyUnavailableTip-orphan-policy')
        .querySelector('[tabindex="0"]');

      expect(trigger).not.toBeNull();
      expect(trigger).toHaveTextContent('Why orphan-policy is unavailable');
    });

    it('renders a row for an orphan policy_id absent from Fleet', () => {
      render(<FormWrapper defaultValues={{ policy_ids: ['policy-1', 'orphan-policy'] }} />);

      expect(screen.getByText('orphan-policy')).toBeInTheDocument();
      const orphanCheckbox = screen
        .getAllByRole('checkbox')
        .find((cb) => cb.getAttribute('id') === 'policy-checkbox-orphan-policy');
      expect(orphanCheckbox).toBeChecked();

      const countEl = screen.getByTestId('policyAssignmentCount');
      expect(countEl).toHaveTextContent('2 of 4 selected');
    });

    it('unchecks an orphan policy_id without clearing other selections', () => {
      const handleChange = jest.fn();
      render(
        <FormWrapper
          defaultValues={{ policy_ids: ['policy-1', 'orphan-policy'] }}
          onFormChange={handleChange}
        />
      );

      const orphanCheckbox = screen
        .getAllByRole('checkbox')
        .find((cb) => cb.getAttribute('id') === 'policy-checkbox-orphan-policy');
      fireEvent.click(orphanCheckbox!);

      const lastCall = handleChange.mock.calls[handleChange.mock.calls.length - 1][0];
      expect(lastCall.policy_ids).toEqual(['policy-1']);
    });

    it('Select all keeps existing orphan ids', () => {
      const handleChange = jest.fn();
      render(
        <FormWrapper
          defaultValues={{ policy_ids: ['orphan-policy'] }}
          onFormChange={handleChange}
        />
      );

      fireEvent.click(screen.getByTestId('policyAssignmentSelectAll'));
      const lastCall = handleChange.mock.calls[handleChange.mock.calls.length - 1][0];
      expect(lastCall.policy_ids).toContain('orphan-policy');
      expect(lastCall.policy_ids).toContain('policy-1');
      expect(lastCall.policy_ids).toContain('policy-2');
      expect(lastCall.policy_ids).toContain('policy-3');
      expect(lastCall.policy_ids).toHaveLength(4);
    });
  });

  describe('read-only mode', () => {
    it('renders checkboxes as disabled in read-only mode', () => {
      render(<FormWrapper isReadOnly={true} />);
      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach((checkbox) => {
        expect(checkbox).toBeDisabled();
      });
    });

    it('select all and un-select all buttons are disabled in read-only mode', () => {
      // Seed a selection so Un-select all is disabled by read-only rather than
      // by there being nothing to clear.
      render(<FormWrapper isReadOnly={true} defaultValues={{ policy_ids: ['policy-1'] }} />);
      expect(screen.getByTestId('policyAssignmentSelectAll')).toBeDisabled();
      expect(screen.getByTestId('policyAssignmentUnselectAll')).toBeDisabled();
    });

    it('View policy links are still usable in read-only mode', () => {
      render(<FormWrapper isReadOnly={true} />);
      const links = screen.getAllByText('View policy');
      expect(links).toHaveLength(3);
      links.forEach((link) => {
        expect(link.closest('a')).toHaveAttribute('href', expect.stringContaining('/policies/'));
      });
    });
  });
});
