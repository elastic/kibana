/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import '@testing-library/jest-dom';
import { EuiFieldText, EuiThemeProvider } from '@elastic/eui';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SerializedPolicy } from '@kbn/index-lifecycle-management-common-shared';
import { EditDataLifecycleFlyoutBody } from './edit_data_lifecycle_flyout_body';

const POLICY_WITH_DOWNSAMPLE: SerializedPolicy = {
  name: '.alerts-ilm-policy',
  phases: {
    hot: { min_age: '0ms', actions: {} },
    warm: { min_age: '7d', actions: { downsample: { fixed_interval: '1h' } } },
    delete: { min_age: '60d', actions: { delete: {} } },
  },
};

describe('EditDataLifecycleFlyoutBody', () => {
  const rowTestSubj = (name: string) =>
    `retentionSelectableRow-${name.replace(/[^a-zA-Z0-9]+/g, '_')}`;
  const inspectTestSubj = (name: string) =>
    `retentionSelectableRowInspect-${name.replace(/[^a-zA-Z0-9]+/g, '_')}`;

  const renderWithTheme = (node: React.ReactElement) =>
    render(node, {
      wrapper: EuiThemeProvider,
    });

  it('disables the policy search and inspect actions when inheriting lifecycle', async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();
    const onInspect = jest.fn();

    renderWithTheme(
      <EditDataLifecycleFlyoutBody
        inherit={{ value: true, onChange: () => {} }}
        method={{ value: 'ilm', onChange: () => {} }}
        ilm={{
          policies: [
            {
              name: POLICY_WITH_DOWNSAMPLE.name,
              phases: POLICY_WITH_DOWNSAMPLE.phases,
              serializedPolicy: POLICY_WITH_DOWNSAMPLE,
            },
          ],
          selectedPolicyName: POLICY_WITH_DOWNSAMPLE.name,
          onSelect,
          onInspect,
        }}
      />
    );

    expect(screen.queryByTestId('retentionSelectorSearchInput')).not.toBeInTheDocument();

    expect(screen.queryByTestId(inspectTestSubj('.alerts-ilm-policy'))).not.toBeInTheDocument();

    // Verify the inherited policy row is present
    expect(screen.getByTestId(rowTestSubj('.alerts-ilm-policy'))).toBeInTheDocument();

    // Click should have no effect (row is read-only)
    await user.click(screen.getByTestId(rowTestSubj('.alerts-ilm-policy')));
    expect(onSelect).not.toHaveBeenCalled();
    expect(onInspect).not.toHaveBeenCalled();
  });

  it('renders the DLM content and allows the consumer to disable it when inheriting lifecycle', () => {
    const inheritLifecycle = true;

    renderWithTheme(
      <EditDataLifecycleFlyoutBody
        inherit={{ value: inheritLifecycle, onChange: () => {} }}
        method={{ value: 'dlm', onChange: () => {} }}
        ilm={{ policies: [], onSelect: () => {}, onInspect: () => {} }}
        dataStreamLifecycleContent={
          <EuiFieldText
            data-test-subj="editDataLifecycle-dlmRetentionInput"
            fullWidth
            disabled={inheritLifecycle}
            defaultValue="30d"
          />
        }
      />
    );

    expect(screen.getByTestId('editDataLifecycle-dlmRetentionInput')).toBeDisabled();
  });

  it('pins the initially selected policy name at the top', () => {
    const policies = [
      { name: 'policy-b', phases: {}, serializedPolicy: undefined },
      { name: 'policy-a', phases: {}, serializedPolicy: undefined },
    ];

    renderWithTheme(
      <EditDataLifecycleFlyoutBody
        method={{ value: 'ilm', onChange: () => {} }}
        ilm={{
          policies,
          selectedPolicyName: 'policy-a',
          onSelect: () => {},
        }}
      />
    );

    const listItems = screen.getAllByRole('listitem');
    const listItemText = listItems.map((el) => el.textContent ?? '');
    const policyAIdx = listItemText.findIndex((t) => t.includes('policy-a'));
    const policyBIdx = listItemText.findIndex((t) => t.includes('policy-b'));
    expect(policyAIdx).toBeGreaterThanOrEqual(0);
    expect(policyBIdx).toBeGreaterThanOrEqual(0);
    expect(policyAIdx).toBeLessThan(policyBIdx);
  });

  it('does not pin a policy selected after the flyout opens', () => {
    const policies = [
      { name: 'policy-b', phases: {}, serializedPolicy: undefined },
      { name: 'policy-a', phases: {}, serializedPolicy: undefined },
    ];

    const { rerender } = renderWithTheme(
      <EditDataLifecycleFlyoutBody
        method={{ value: 'ilm', onChange: () => {} }}
        ilm={{
          policies,
          selectedPolicyName: undefined,
          onSelect: () => {},
        }}
      />
    );

    rerender(
      <EditDataLifecycleFlyoutBody
        method={{ value: 'ilm', onChange: () => {} }}
        ilm={{
          policies,
          selectedPolicyName: undefined,
          onSelect: () => {},
        }}
      />
    );

    rerender(
      <EditDataLifecycleFlyoutBody
        method={{ value: 'ilm', onChange: () => {} }}
        ilm={{
          policies,
          selectedPolicyName: 'policy-a',
          onSelect: () => {},
        }}
      />
    );

    const listItems = screen.getAllByRole('listitem');
    const listItemText = listItems.map((el) => el.textContent ?? '');
    const policyAIdx = listItemText.findIndex((t) => t.includes('policy-a'));
    const policyBIdx = listItemText.findIndex((t) => t.includes('policy-b'));
    expect(policyAIdx).toBeGreaterThanOrEqual(0);
    expect(policyBIdx).toBeGreaterThanOrEqual(0);
    expect(policyBIdx).toBeLessThan(policyAIdx);
  });

  it('renders the inherited lifecycle method when inheriting is enabled', () => {
    const inheritLifecycle = true;

    renderWithTheme(
      <EditDataLifecycleFlyoutBody
        inherit={{ value: inheritLifecycle, onChange: () => {} }}
        // Simulate consumer preserving the last non-inherited selection (ILM)
        method={{ value: 'ilm', onChange: () => {} }}
        ilm={{ policies: [], onSelect: () => {}, onInspect: () => {} }}
        dataStreamLifecycleContent={
          <EuiFieldText
            data-test-subj="editDataLifecycle-dlmRetentionInput"
            fullWidth
            disabled={inheritLifecycle}
            defaultValue="30d"
          />
        }
      />
    );

    // Inherited method is DLM, so DLM content should be shown and ILM panels should not.
    expect(screen.getByTestId('editDataLifecycle-dlmRetentionInput')).toBeInTheDocument();
    expect(
      screen.queryByTestId('editDataLifecycle-noInheritedPolicyPanel')
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('editDataLifecycle-ilmNotConfiguredPanel')).not.toBeInTheDocument();
  });

  it('keeps showing the inherited ILM policy while inheriting, even if selection changes', () => {
    const policies = [
      { name: 'policy-a', phases: {}, serializedPolicy: undefined },
      { name: 'policy-b', phases: {}, serializedPolicy: undefined },
    ];

    const { rerender } = renderWithTheme(
      <EditDataLifecycleFlyoutBody
        inherit={{ value: true, onChange: () => {} }}
        method={{ value: 'ilm', onChange: () => {} }}
        ilm={{
          policies,
          selectedPolicyName: 'policy-a',
          onSelect: () => {},
        }}
      />
    );

    // Simulate local selection changes while still inheriting.
    rerender(
      <EditDataLifecycleFlyoutBody
        inherit={{ value: true, onChange: () => {} }}
        method={{ value: 'ilm', onChange: () => {} }}
        ilm={{
          policies,
          selectedPolicyName: 'policy-b',
          onSelect: () => {},
        }}
      />
    );

    expect(screen.getByTestId(rowTestSubj('policy-a'))).toBeInTheDocument();
    expect(screen.queryByTestId(rowTestSubj('policy-b'))).not.toBeInTheDocument();
  });

  it('keeps showing the inherited DLM content while inheriting, even if content changes', () => {
    const { rerender } = renderWithTheme(
      <EditDataLifecycleFlyoutBody
        inherit={{ value: true, onChange: () => {} }}
        method={{ value: 'ilm', onChange: () => {} }}
        ilm={{ policies: [], onSelect: () => {} }}
        dataStreamLifecycleContent={<div data-test-subj="dlmPinnedValue">inherited</div>}
      />
    );

    rerender(
      <EditDataLifecycleFlyoutBody
        inherit={{ value: true, onChange: () => {} }}
        method={{ value: 'ilm', onChange: () => {} }}
        ilm={{ policies: [], onSelect: () => {} }}
        dataStreamLifecycleContent={<div data-test-subj="dlmPinnedValue">local</div>}
      />
    );

    expect(screen.getByTestId('dlmPinnedValue')).toHaveTextContent('inherited');
  });

  it('keeps inheriting DLM after a local ILM policy is selected and inheritance is re-enabled', () => {
    const policies = [{ name: 'policy-a', phases: {}, serializedPolicy: undefined }];

    const { rerender } = renderWithTheme(
      <EditDataLifecycleFlyoutBody
        inherit={{ value: true, onChange: () => {} }}
        method={{ value: 'dlm', onChange: () => {} }}
        ilm={{ policies, selectedPolicyName: undefined, onSelect: () => {} }}
        dataStreamLifecycleContent={<div data-test-subj="dlmPinnedValue">inherited DLM</div>}
      />
    );

    rerender(
      <EditDataLifecycleFlyoutBody
        inherit={{ value: false, onChange: () => {} }}
        method={{ value: 'ilm', onChange: () => {} }}
        ilm={{ policies, selectedPolicyName: 'policy-a', onSelect: () => {} }}
        dataStreamLifecycleContent={<div data-test-subj="dlmPinnedValue">local DLM</div>}
      />
    );

    expect(screen.getByTestId(rowTestSubj('policy-a'))).toBeInTheDocument();

    rerender(
      <EditDataLifecycleFlyoutBody
        inherit={{ value: true, onChange: () => {} }}
        method={{ value: 'ilm', onChange: () => {} }}
        ilm={{ policies, selectedPolicyName: 'policy-a', onSelect: () => {} }}
        dataStreamLifecycleContent={<div data-test-subj="dlmPinnedValue">inherited DLM</div>}
      />
    );

    expect(screen.getByTestId('dlmPinnedValue')).toHaveTextContent('inherited DLM');
    expect(screen.queryByTestId(rowTestSubj('policy-a'))).not.toBeInTheDocument();
  });

  it('resets uncontrolled DLM input back to inherited value when re-enabling inherit', async () => {
    const user = userEvent.setup();

    const renderContent = (inheritLifecycle: boolean) => (
      <input
        data-test-subj="dlmUncontrolledInput"
        defaultValue="inherited"
        disabled={inheritLifecycle}
      />
    );

    const { rerender } = renderWithTheme(
      <EditDataLifecycleFlyoutBody
        inherit={{ value: true, onChange: () => {} }}
        method={{ value: 'dlm', onChange: () => {} }}
        ilm={{ policies: [], onSelect: () => {} }}
        dataStreamLifecycleContent={renderContent(true)}
      />
    );

    // Switch to non-inherited mode and edit the uncontrolled input.
    rerender(
      <EditDataLifecycleFlyoutBody
        inherit={{ value: false, onChange: () => {} }}
        method={{ value: 'dlm', onChange: () => {} }}
        ilm={{ policies: [], onSelect: () => {} }}
        dataStreamLifecycleContent={renderContent(false)}
      />
    );

    const input = screen.getByTestId('dlmUncontrolledInput') as HTMLInputElement;
    await user.clear(input);
    await user.type(input, 'local');
    expect(input.value).toBe('local');

    // Re-enable inheritance: should show the inherited default again.
    rerender(
      <EditDataLifecycleFlyoutBody
        inherit={{ value: true, onChange: () => {} }}
        method={{ value: 'dlm', onChange: () => {} }}
        ilm={{ policies: [], onSelect: () => {} }}
        dataStreamLifecycleContent={renderContent(true)}
      />
    );

    expect((screen.getByTestId('dlmUncontrolledInput') as HTMLInputElement).value).toBe(
      'inherited'
    );
  });
});
