/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { createIntegrationsTestRendererMock } from '../../../../../../../mock';

import { NamespaceCustomizationSection } from './namespace_customization_section';

function renderSection(
  props: Partial<React.ComponentProps<typeof NamespaceCustomizationSection>> = {}
) {
  const renderer = createIntegrationsTestRendererMock();
  const onSave = jest.fn();
  return {
    onSave,
    ...renderer.render(
      <NamespaceCustomizationSection
        savedNamespaces={[]}
        allowedNamespacePrefixes={[]}
        onSave={onSave}
        {...props}
      />
    ),
  };
}

describe('NamespaceCustomizationSection', () => {
  it('renders the title and an empty combo box when no namespaces are saved', () => {
    const { getByText, getByTestId } = renderSection();
    expect(getByText('Namespace index templates')).toBeInTheDocument();
    expect(getByTestId('epmSettings.namespaceCustomizationInput')).toBeInTheDocument();
  });

  it('shows existing saved namespaces as selected options', () => {
    const { getByText } = renderSection({ savedNamespaces: ['prod', 'qa'] });
    expect(getByText('prod')).toBeInTheDocument();
    expect(getByText('qa')).toBeInTheDocument();
  });

  it('does not show Save/Discard buttons when the draft matches saved namespaces', () => {
    const { queryByTestId } = renderSection({ savedNamespaces: ['prod'] });
    expect(queryByTestId('epmSettings.namespaceCustomizationSave')).not.toBeInTheDocument();
    expect(queryByTestId('epmSettings.namespaceCustomizationDiscard')).not.toBeInTheDocument();
  });

  it('shows Save and Discard buttons after adding a namespace', async () => {
    const { getByTestId } = renderSection({ savedNamespaces: [] });

    const input = getByTestId('epmSettings.namespaceCustomizationInput').querySelector('input')!;
    await userEvent.type(input, 'prod');
    await userEvent.keyboard('{Enter}');

    expect(getByTestId('epmSettings.namespaceCustomizationSave')).toBeInTheDocument();
    expect(getByTestId('epmSettings.namespaceCustomizationDiscard')).toBeInTheDocument();
  });

  it('calls onSave with the new namespace list when Save is clicked', async () => {
    const { getByTestId, onSave } = renderSection({ savedNamespaces: ['prod'] });

    const input = getByTestId('epmSettings.namespaceCustomizationInput').querySelector('input')!;
    await userEvent.type(input, 'qa');
    await userEvent.keyboard('{Enter}');
    await userEvent.click(getByTestId('epmSettings.namespaceCustomizationSave'));

    expect(onSave).toHaveBeenCalledWith(expect.arrayContaining(['prod', 'qa']));
  });

  it('reverts to saved namespaces and hides buttons when Discard is clicked', async () => {
    const { getByTestId, queryByTestId, queryByText } = renderSection({
      savedNamespaces: ['prod'],
    });

    const input = getByTestId('epmSettings.namespaceCustomizationInput').querySelector('input')!;
    await userEvent.type(input, 'qa');
    await userEvent.keyboard('{Enter}');

    await userEvent.click(getByTestId('epmSettings.namespaceCustomizationDiscard'));

    expect(queryByText('qa')).not.toBeInTheDocument();
    expect(queryByTestId('epmSettings.namespaceCustomizationSave')).not.toBeInTheDocument();
    expect(queryByTestId('epmSettings.namespaceCustomizationDiscard')).not.toBeInTheDocument();
  });

  it('adds an invalid namespace as a pill, shows a validation error, and disables Save', async () => {
    const { getByTestId, queryByText } = renderSection({
      savedNamespaces: [],
      allowedNamespacePrefixes: ['prod'],
    });

    const input = getByTestId('epmSettings.namespaceCustomizationInput').querySelector('input')!;
    await userEvent.type(input, 'staging');
    await userEvent.keyboard('{Enter}');

    // Pill is added even though it violates the prefix rule.
    expect(queryByText('staging')).toBeInTheDocument();
    // Save/Discard are shown because the draft is dirty.
    expect(getByTestId('epmSettings.namespaceCustomizationSave')).toBeInTheDocument();
    expect(getByTestId('epmSettings.namespaceCustomizationDiscard')).toBeInTheDocument();
    // Save is disabled until the invalid pill is removed.
    expect(getByTestId('epmSettings.namespaceCustomizationSave')).toBeDisabled();
  });

  it('enables Save after removing an invalid pill when other changes remain', async () => {
    // Start with prod saved; add a valid prodqa pill and an invalid staging pill.
    // After removing staging, draft=[prod, prodqa] is still dirty — Save should be enabled.
    const { getByTestId } = renderSection({
      savedNamespaces: ['prod'],
      allowedNamespacePrefixes: ['prod'],
    });

    const input = getByTestId('epmSettings.namespaceCustomizationInput').querySelector('input')!;

    await userEvent.type(input, 'prodqa');
    await userEvent.keyboard('{Enter}');
    await userEvent.type(input, 'staging');
    await userEvent.keyboard('{Enter}');

    // Save is disabled due to the invalid 'staging' pill.
    expect(getByTestId('epmSettings.namespaceCustomizationSave')).toBeDisabled();

    // Remove the invalid 'staging' pill via its close button.
    const combobox = getByTestId('epmSettings.namespaceCustomizationInput');
    const stagingPill = within(combobox)
      .getAllByTestId('euiComboBoxPill')
      .find((pill) => pill.textContent?.includes('staging'))!;
    const removeStagingButton = within(stagingPill).getByRole('button');
    await userEvent.click(removeStagingButton);

    // Draft still differs from saved (prod-qa is new), so Save is shown and enabled.
    expect(getByTestId('epmSettings.namespaceCustomizationSave')).toBeInTheDocument();
    expect(getByTestId('epmSettings.namespaceCustomizationSave')).not.toBeDisabled();
  });

  it('does not add a duplicate namespace', async () => {
    const { getByTestId, queryAllByText } = renderSection({ savedNamespaces: ['prod'] });

    const input = getByTestId('epmSettings.namespaceCustomizationInput').querySelector('input')!;
    await userEvent.type(input, 'prod');
    await userEvent.keyboard('{Enter}');

    // EUI prevents the duplicate from being added.
    expect(queryAllByText('prod')).toHaveLength(1);
  });

  it('resets draft and clears errors when savedNamespaces prop changes (after external save)', async () => {
    const { getByTestId, queryByTestId, rerender } = renderSection({ savedNamespaces: [] });

    const input = getByTestId('epmSettings.namespaceCustomizationInput').querySelector('input')!;
    await userEvent.type(input, 'staging!');
    await userEvent.keyboard('{Enter}');

    act(() => {
      rerender(
        <NamespaceCustomizationSection
          savedNamespaces={['prod']}
          allowedNamespacePrefixes={[]}
          onSave={jest.fn()}
        />
      );
    });

    expect(queryByTestId('epmSettings.namespaceCustomizationSave')).not.toBeInTheDocument();
  });

  it('shows the in-progress spinner when isSubmitting is true', () => {
    const { getByTestId, queryByTestId } = renderSection({
      savedNamespaces: [],
      isSubmitting: true,
    });
    expect(getByTestId('epmSettings.namespaceCustomizationApplying')).toBeInTheDocument();
    expect(queryByTestId('epmSettings.namespaceCustomizationSave')).not.toBeInTheDocument();
  });

  describe('ILM policy removal warning', () => {
    const removePill = (renderResult: ReturnType<typeof renderSection>, namespace: string) => {
      const combobox = renderResult.getByTestId('epmSettings.namespaceCustomizationInput');
      const pill = within(combobox)
        .getAllByTestId('euiComboBoxPill')
        .find((p) => p.textContent?.includes(namespace))!;
      return userEvent.click(within(pill).getByRole('button'));
    };

    it('does not show when no namespace is removed', () => {
      const { queryByText } = renderSection({
        savedNamespaces: ['prod'],
        namespaceCustomizationSettings: { prod: { ilm_policy: 'my-policy' } },
      });
      expect(queryByText('ILM policy will be removed')).not.toBeInTheDocument();
    });

    it('does not show when the removed namespace has no ilm_policy', async () => {
      const result = renderSection({
        savedNamespaces: ['prod'],
        namespaceCustomizationSettings: {},
      });
      await removePill(result, 'prod');
      expect(result.queryByText('ILM policy will be removed')).not.toBeInTheDocument();
    });

    it('shows a warning naming the namespace when removing one with an ilm_policy', async () => {
      const result = renderSection({
        savedNamespaces: ['prod'],
        namespaceCustomizationSettings: { prod: { ilm_policy: 'my-policy' } },
      });
      await removePill(result, 'prod');
      expect(result.getByText('ILM policy will be removed')).toBeInTheDocument();
      expect(
        result.getByText(
          (_, node) =>
            node?.textContent ===
            'Removing prod will also clear the ILM policy assigned to that namespace.'
        )
      ).toBeInTheDocument();
    });

    it('hides again after discarding the removal', async () => {
      const result = renderSection({
        savedNamespaces: ['prod'],
        namespaceCustomizationSettings: { prod: { ilm_policy: 'my-policy' } },
      });
      await removePill(result, 'prod');
      expect(result.getByText('ILM policy will be removed')).toBeInTheDocument();

      await userEvent.click(result.getByTestId('epmSettings.namespaceCustomizationDiscard'));
      expect(result.queryByText('ILM policy will be removed')).not.toBeInTheDocument();
    });
  });
});
