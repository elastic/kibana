/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { EuiProvider } from '@elastic/eui';
import { PolicyAssignmentList } from './policy_assignment_list';

const mockGetUrlForApp = jest.fn(
  (appId: string, opts: { path: string }) => `/app/${appId}${opts.path}`
);

jest.mock('../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: {
      application: {
        getUrlForApp: mockGetUrlForApp,
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
}

const FormWrapper: React.FC<WrapperProps> = ({
  defaultValues = { policy_ids: [], shards: {} },
  isReadOnly = false,
  onFormChange,
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
          <PolicyAssignmentList isReadOnly={isReadOnly} />
        </FormProvider>
      </IntlProvider>
    </EuiProvider>
  );
};

describe('PolicyAssignmentList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAgentPolicies.mockReturnValue({
      data: { agentPoliciesById: mockAgentPoliciesById },
      isFetching: false,
      isError: false,
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

    it('select all with active search selects ALL policies, not just filtered', () => {
      const handleChange = jest.fn();
      render(<FormWrapper onFormChange={handleChange} />);
      // Search to filter down to one visible row
      const searchInput = screen.getByPlaceholderText('Search policies');
      fireEvent.change(searchInput, { target: { value: 'Alpha' } });
      // Click select all — should select all 3, not just the 1 visible
      fireEvent.click(screen.getByTestId('policyAssignmentSelectAll'));
      const lastCall = handleChange.mock.calls[handleChange.mock.calls.length - 1][0];
      expect(lastCall.policy_ids).toHaveLength(3);
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
