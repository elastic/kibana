/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import type { AffectedResource } from './edit_policy_modal';
import { EditPolicyModal } from './edit_policy_modal';

jest.mock('../../../../../../hooks/use_kibana', () => ({
  useKibana: () => ({
    dependencies: {
      start: {
        share: {
          url: {
            locators: {
              get: () => ({
                getRedirectUrl: ({ policyName }: { policyName: string }) =>
                  `/app/management/data/index_lifecycle_management/policies/edit/${policyName}`,
              }),
            },
          },
        },
      },
    },
  }),
}));

describe('EditPolicyModal', () => {
  const policyName = '.monitoring-8-ilm-policy';
  const affectedResources = [
    { name: 'index-1', type: 'index' },
    { name: 'index-2', type: 'index' },
    { name: 'stream-1', type: 'stream' },
    { name: 'stream-2', type: 'stream' },
    { name: 'stream-3', type: 'stream' },
  ] as AffectedResource[];

  it('renders a single consistent title across all flavors', () => {
    renderWithI18n(
      <EditPolicyModal
        policyName={policyName}
        affectedResources={affectedResources}
        onCancel={() => {}}
        onOverwrite={() => {}}
        onSaveAsNew={() => {}}
      />
    );

    expect(screen.getByTestId('editPolicyModalTitle')).toHaveTextContent(
      'Confirm changes to ILM policy'
    );
  });

  it('renders the policy name as a link to the ILM policy edit page', () => {
    renderWithI18n(
      <EditPolicyModal
        policyName={policyName}
        affectedResources={affectedResources}
        onCancel={() => {}}
        onOverwrite={() => {}}
        onSaveAsNew={() => {}}
      />
    );

    const link = screen.getByTestId('editPolicyModal-policyNameLink');
    expect(link).toHaveTextContent(policyName);
    expect(link).toHaveAttribute(
      'href',
      `/app/management/data/index_lifecycle_management/policies/edit/${policyName}`
    );
  });

  describe('managed and in use (both)', () => {
    it('describes the policy as managed and in use, and lists affected data sources', () => {
      renderWithI18n(
        <EditPolicyModal
          policyName={policyName}
          affectedResources={affectedResources}
          isManaged={true}
          onCancel={() => {}}
          onOverwrite={() => {}}
          onSaveAsNew={() => {}}
        />
      );

      const description = screen.getByTestId('editPolicyModal-description');
      expect(description).toHaveTextContent(policyName);
      expect(description).toHaveTextContent('is managed by Elastic and is already being used in');
      expect(description).toHaveTextContent('3 streams and 2 indices in addition to this stream');

      expect(screen.getByTestId('editPolicyModal-affectedResourcesTitle')).toHaveTextContent(
        'Affected data sources'
      );
      expect(
        screen.getByTestId('editPolicyModal-affectedResourcesList-index-1')
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('editPolicyModal-affectedResourcesList-stream-3')
      ).toBeInTheDocument();
    });
  });

  describe('multiple data sources only', () => {
    it('describes the policy as in use without mentioning it is managed', () => {
      renderWithI18n(
        <EditPolicyModal
          policyName={policyName}
          affectedResources={affectedResources}
          isManaged={false}
          onCancel={() => {}}
          onOverwrite={() => {}}
          onSaveAsNew={() => {}}
        />
      );

      const description = screen.getByTestId('editPolicyModal-description');
      expect(description).toHaveTextContent(policyName);
      expect(description).toHaveTextContent(
        'is already being used in 3 streams and 2 indices in addition to this stream'
      );
      expect(description).not.toHaveTextContent('is managed by Elastic');

      expect(screen.getByTestId('editPolicyModal-affectedResourcesList')).toBeInTheDocument();
    });

    it('renders usage with only streams when there are no indices', () => {
      renderWithI18n(
        <EditPolicyModal
          policyName={policyName}
          affectedResources={[
            { name: 'stream-1', type: 'stream' },
            { name: 'stream-2', type: 'stream' },
          ]}
          onCancel={() => {}}
          onOverwrite={() => {}}
          onSaveAsNew={() => {}}
        />
      );

      expect(screen.getByTestId('editPolicyModal-description')).toHaveTextContent(
        'is already being used in 2 streams in addition to this stream'
      );
    });

    it('renders usage with only indices when there are no streams', () => {
      renderWithI18n(
        <EditPolicyModal
          policyName={policyName}
          affectedResources={[
            { name: 'index-1', type: 'index' },
            { name: 'index-2', type: 'index' },
          ]}
          onCancel={() => {}}
          onOverwrite={() => {}}
          onSaveAsNew={() => {}}
        />
      );

      expect(screen.getByTestId('editPolicyModal-description')).toHaveTextContent(
        'is already being used in 2 indices in addition to this stream'
      );
    });

    it('renders singular usage for one other stream and one other index', () => {
      renderWithI18n(
        <EditPolicyModal
          policyName={policyName}
          affectedResources={[
            { name: 'stream-1', type: 'stream' },
            { name: 'index-1', type: 'index' },
          ]}
          onCancel={() => {}}
          onOverwrite={() => {}}
          onSaveAsNew={() => {}}
        />
      );

      expect(screen.getByTestId('editPolicyModal-description')).toHaveTextContent(
        'is already being used in 1 stream and 1 index in addition to this stream'
      );
    });
  });

  describe('managed only', () => {
    it('describes the policy as managed and does not render the affected data sources list', () => {
      renderWithI18n(
        <EditPolicyModal
          policyName={policyName}
          affectedResources={[]}
          isManaged={true}
          onCancel={() => {}}
          onOverwrite={() => {}}
          onSaveAsNew={() => {}}
        />
      );

      const description = screen.getByTestId('editPolicyModal-description');
      expect(description).toHaveTextContent(policyName);
      expect(description).toHaveTextContent('is managed by Elastic');
      expect(description).not.toHaveTextContent('currently used in');

      expect(screen.queryByTestId('editPolicyModal-affectedResourcesList')).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('editPolicyModal-affectedResourcesTitle')
      ).not.toBeInTheDocument();
    });
  });
});
