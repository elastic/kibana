/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The callout is the only pre-save signal that a pack will over-deliver, and the
 * Fleet lookups behind it are easy to get subtly wrong (an unknown kuery type
 * prefix 400s; an agent policy's id is not a queryable field). These tests pin
 * the request shapes as well as the rendered output.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { EuiProvider } from '@elastic/eui';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';

import { TargetingWarningCallout } from './targeting_warning_callout';

const mockHttpGet = jest.fn();
const mockHttpPost = jest.fn();

jest.mock('../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: {
      http: {
        get: (...args: unknown[]) => mockHttpGet(...args),
        post: (...args: unknown[]) => mockHttpPost(...args),
      },
    },
  }),
}));

const renderCallout = (policyIds: string[]) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <EuiProvider>
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <TargetingWarningCallout policyIds={policyIds} />
        </QueryClientProvider>
      </IntlProvider>
    </EuiProvider>
  );
};

/** One package policy shared by policy-a and policy-b. */
const sharedPackagePolicies = {
  items: [{ id: 'pp-shared', policy_ids: ['policy-a', 'policy-b'] }],
};

describe('TargetingWarningCallout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when the integration is shared with an untargeted agent policy', () => {
    beforeEach(() => {
      mockHttpGet.mockResolvedValue(sharedPackagePolicies);
      mockHttpPost.mockResolvedValue({ items: [{ id: 'policy-b', name: 'Policy B' }] });
    });

    it('should warn and name the untargeted agent policy', async () => {
      renderCallout(['policy-a']);

      expect(await screen.findByTestId('packTargetingWarningCallout')).toBeInTheDocument();
      expect(screen.getByText(/Policy B/)).toBeInTheDocument();
    });

    it('should query package policies by saved-object type, not the `package_policies.` prefix', async () => {
      // `package_policies.package.name:...` is rejected by Fleet with a 400,
      // which would silently disable the whole callout.
      renderCallout(['policy-a']);

      await waitFor(() => expect(mockHttpGet).toHaveBeenCalled());
      const [path, options] = mockHttpGet.mock.calls[0];
      expect(path).toBe('/api/fleet/package_policies');
      expect(options.query.kuery).toBe('fleet-package-policies.package.name:"osquery_manager"');
      expect(options.query.kuery).not.toContain('package_policies.package');
      // Public versioned route: omitting the version 400s in production.
      expect(options.version).toBe('2023-10-31');
    });

    it('should resolve agent policy names via _bulk_get, not a kuery on the id', async () => {
      // An agent policy's id is its saved-object id and is not a queryable
      // field: `agent_policies.id:"<id>"` 400s and `id:"<id>"` matches nothing.
      renderCallout(['policy-a']);

      await waitFor(() => expect(mockHttpPost).toHaveBeenCalled());
      const [path, options] = mockHttpPost.mock.calls[0];
      expect(path).toBe('/api/fleet/agent_policies/_bulk_get');
      expect(JSON.parse(options.body)).toEqual({
        ids: ['policy-b'],
        ignoreMissing: true,
      });
      expect(options.version).toBe('2023-10-31');
    });

    it('should fall back to the raw id when an agent policy no longer resolves', async () => {
      // Dropping the name would understate how many policies receive the pack.
      mockHttpPost.mockResolvedValue({ items: [] });
      renderCallout(['policy-a']);

      expect(await screen.findByTestId('packTargetingWarningCallout')).toBeInTheDocument();
      expect(screen.getByText(/policy-b/)).toBeInTheDocument();
    });
  });

  describe('when targeting is exact', () => {
    it('should render nothing when every covered agent policy is targeted', async () => {
      mockHttpGet.mockResolvedValue(sharedPackagePolicies);
      renderCallout(['policy-a', 'policy-b']);

      await waitFor(() => expect(mockHttpGet).toHaveBeenCalled());
      expect(screen.queryByTestId('packTargetingWarningCallout')).not.toBeInTheDocument();
      // No untargeted policies means no name lookup at all.
      expect(mockHttpPost).not.toHaveBeenCalled();
    });

    it('should ignore package policies that do not cover any targeted agent policy', async () => {
      mockHttpGet.mockResolvedValue({
        items: [{ id: 'pp-unrelated', policy_ids: ['policy-c', 'policy-d'] }],
      });
      renderCallout(['policy-a']);

      await waitFor(() => expect(mockHttpGet).toHaveBeenCalled());
      expect(screen.queryByTestId('packTargetingWarningCallout')).not.toBeInTheDocument();
      expect(mockHttpPost).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should not query Fleet when no agent policy is selected', () => {
      renderCallout([]);

      expect(mockHttpGet).not.toHaveBeenCalled();
      expect(mockHttpPost).not.toHaveBeenCalled();
      expect(screen.queryByTestId('packTargetingWarningCallout')).not.toBeInTheDocument();
    });

    it('should render nothing when the package policy lookup fails', async () => {
      mockHttpGet.mockRejectedValue(new Error('Bad Request'));
      renderCallout(['policy-a']);

      await waitFor(() => expect(mockHttpGet).toHaveBeenCalled());
      expect(screen.queryByTestId('packTargetingWarningCallout')).not.toBeInTheDocument();
    });

    it('should tolerate a package policy with no policy_ids', async () => {
      mockHttpGet.mockResolvedValue({ items: [{ id: 'pp-empty' }] });
      renderCallout(['policy-a']);

      await waitFor(() => expect(mockHttpGet).toHaveBeenCalled());
      expect(screen.queryByTestId('packTargetingWarningCallout')).not.toBeInTheDocument();
    });

    it('should dedupe an agent policy covered by more than one shared package policy', async () => {
      mockHttpGet.mockResolvedValue({
        items: [
          { id: 'pp-1', policy_ids: ['policy-a', 'policy-c'] },
          { id: 'pp-2', policy_ids: ['policy-a', 'policy-c'] },
        ],
      });
      mockHttpPost.mockResolvedValue({ items: [{ id: 'policy-c', name: 'Policy C' }] });
      renderCallout(['policy-a']);

      await waitFor(() => expect(mockHttpPost).toHaveBeenCalled());
      expect(JSON.parse(mockHttpPost.mock.calls[0][1].body).ids).toEqual(['policy-c']);
    });
  });
});
