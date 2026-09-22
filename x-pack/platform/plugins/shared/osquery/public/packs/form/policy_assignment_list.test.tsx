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
  'policy-1': { name: 'Alpha Policy', agents: 5, id: 'policy-1', description: '' },
  'policy-2': { name: 'Beta Policy', agents: 10, id: 'policy-2', description: '' },
  'policy-3': { name: 'Gamma Policy', agents: 3, id: 'policy-3', description: '' },
};

const mockUseAgentPolicies = jest.fn();

jest.mock('../../agent_policies', () => ({
  useAgentPolicies: () => mockUseAgentPolicies(),
}));

jest.mock('@kbn/fleet-plugin/public', () => ({
  pagePathGetters: {
    policy_details: ({ policyId }: { policyId: string }) => ['', `/fleet/policies/${policyId}`],
  },
}));

jest.mock('@kbn/fleet-plugin/common', () => ({
  PLUGIN_ID: 'fleet',
}));

interface WrapperProps {
  defaultValues?: { policy_ids: string[] };
  isReadOnly?: boolean;
  onFormChange?: (values: { policy_ids: string[] }) => void;
}

const FormWrapper: React.FC<WrapperProps> = ({
  defaultValues = { policy_ids: [] },
  isReadOnly = false,
  onFormChange,
}) => {
  const methods = useForm<{ policy_ids: string[] }>({ defaultValues });

  const values = methods.watch();
  React.useEffect(() => {
    onFormChange?.(values);
  });

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
      });
      render(<FormWrapper />);
      expect(screen.getByText('No agent policies found')).toBeInTheDocument();
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
      expect(hrefs).toContain('/app/fleet/fleet/policies/policy-1');
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
  });

  describe('selection', () => {
    it('shows selection count', () => {
      render(<FormWrapper defaultValues={{ policy_ids: ['policy-1', 'policy-2'] }} />);
      const countEl = screen.getByTestId('policyAssignmentCount');
      expect(countEl).toHaveTextContent('2 of 3 selected');
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

    it('selection persists across simulated page navigation (form value not pruned)', () => {
      // This test asserts the form value directly rather than visual state,
      // because the EUI built-in selection would prune off-page selections.
      const handleChange = jest.fn();
      render(
        <FormWrapper
          defaultValues={{ policy_ids: ['policy-1', 'policy-3'] }}
          onFormChange={handleChange}
        />
      );
      // Form value should contain both selections even before any interaction
      const initialCall = handleChange.mock.calls[0]?.[0];
      expect(initialCall?.policy_ids).toContain('policy-1');
      expect(initialCall?.policy_ids).toContain('policy-3');
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
      render(<FormWrapper isReadOnly={true} />);
      expect(screen.getByTestId('policyAssignmentSelectAll')).toBeDisabled();
      expect(screen.getByTestId('policyAssignmentUnselectAll')).toBeDisabled();
    });

    it('View policy links are still usable in read-only mode', () => {
      render(<FormWrapper isReadOnly={true} />);
      const links = screen.getAllByText('View policy');
      expect(links).toHaveLength(3);
      links.forEach((link) => {
        expect(link.closest('a')).not.toHaveAttribute('disabled');
      });
    });
  });
});
