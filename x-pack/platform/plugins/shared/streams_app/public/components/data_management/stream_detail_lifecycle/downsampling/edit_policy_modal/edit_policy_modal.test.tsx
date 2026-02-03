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

describe('EditPolicyModal', () => {
  const affectedResources = [
    { name: 'index-1', type: 'index' },
    { name: 'index-2', type: 'index' },
    { name: 'stream-1', type: 'stream' },
    { name: 'stream-2', type: 'stream' },
    { name: 'stream-3', type: 'stream' },
  ] as AffectedResource[];

  it('renders indices and streams that use the edited policy', () => {
    renderWithI18n(
      <EditPolicyModal
        affectedResources={affectedResources}
        onCancel={() => {}}
        onOverwrite={() => {}}
        onSaveAsNew={() => {}}
      />
    );

    expect(screen.getByTestId('editPolicyModalTitle')).toHaveTextContent(
      '3 streams and 2 indices will be affected'
    );
    expect(screen.getByTestId('editPolicyModal-affectedResourcesList-index-1')).toBeInTheDocument();
    expect(screen.getByTestId('editPolicyModal-affectedResourcesList-index-2')).toBeInTheDocument();
    expect(
      screen.getByTestId('editPolicyModal-affectedResourcesList-stream-1')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('editPolicyModal-affectedResourcesList-stream-2')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('editPolicyModal-affectedResourcesList-stream-3')
    ).toBeInTheDocument();
  });

  it('renders title with only streams when there are no indices', () => {
    renderWithI18n(
      <EditPolicyModal
        affectedResources={[
          { name: 'stream-1', type: 'stream' },
          { name: 'stream-2', type: 'stream' },
        ]}
        onCancel={() => {}}
        onOverwrite={() => {}}
        onSaveAsNew={() => {}}
      />
    );

    expect(screen.getByTestId('editPolicyModalTitle')).toHaveTextContent(
      '2 streams will be affected'
    );
  });

  it('renders title with only indices when there are no streams', () => {
    renderWithI18n(
      <EditPolicyModal
        affectedResources={[
          { name: 'index-1', type: 'index' },
          { name: 'index-2', type: 'index' },
        ]}
        onCancel={() => {}}
        onOverwrite={() => {}}
        onSaveAsNew={() => {}}
      />
    );

    expect(screen.getByTestId('editPolicyModalTitle')).toHaveTextContent(
      '2 indices will be affected'
    );
  });

  it('does not render indices and streams if the policy is not in use for others', () => {
    renderWithI18n(
      <EditPolicyModal
        affectedResources={[]}
        onCancel={() => {}}
        onOverwrite={() => {}}
        onSaveAsNew={() => {}}
      />
    );

    expect(screen.getByTestId('editPolicyModalTitle')).toHaveTextContent('Confirm policy changes');
    expect(screen.queryByTestId('editPolicyModal-affectedResourcesList')).not.toBeInTheDocument();
  });

  it('renders a managed title when the policy is managed but not in use', () => {
    renderWithI18n(
      <EditPolicyModal
        affectedResources={[]}
        isManaged={true}
        onCancel={() => {}}
        onOverwrite={() => {}}
        onSaveAsNew={() => {}}
      />
    );

    expect(screen.getByTestId('editPolicyModalTitle')).toHaveTextContent(
      'Confirm changes to managed policy'
    );
  });

  it('renders managed policy warning', () => {
    renderWithI18n(
      <EditPolicyModal
        affectedResources={affectedResources}
        isManaged={true}
        onCancel={() => {}}
        onOverwrite={() => {}}
        onSaveAsNew={() => {}}
      />
    );

    expect(screen.getByTestId('editPolicyModal-managedWarning')).toBeInTheDocument();
  });

  it('does not render managed policy warning when is not managed', () => {
    renderWithI18n(
      <EditPolicyModal
        affectedResources={affectedResources}
        isManaged={false}
        onCancel={() => {}}
        onOverwrite={() => {}}
        onSaveAsNew={() => {}}
      />
    );

    expect(screen.queryByTestId('editPolicyModal-managedWarning')).not.toBeInTheDocument();
  });
});
