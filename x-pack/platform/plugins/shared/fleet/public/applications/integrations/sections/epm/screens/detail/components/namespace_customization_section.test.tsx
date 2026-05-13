/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from '@testing-library/react';
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
    expect(getByText('Namespace customization')).toBeInTheDocument();
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
    const { getByTestId, queryByTestId } = renderSection({ savedNamespaces: [] });

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

  it('shows an error and does not add a namespace that violates prefix rules', async () => {
    const { getByTestId, queryByText, queryByTestId } = renderSection({
      savedNamespaces: [],
      allowedNamespacePrefixes: ['prod'],
    });

    const input = getByTestId('epmSettings.namespaceCustomizationInput').querySelector('input')!;
    await userEvent.type(input, 'staging');
    await userEvent.keyboard('{Enter}');

    expect(queryByText('staging')).not.toBeInTheDocument();
    // Draft was not modified, so Save/Discard buttons do not appear.
    expect(queryByTestId('epmSettings.namespaceCustomizationSave')).not.toBeInTheDocument();
    // Validation error is shown in the form row.
    expect(getByTestId('epmSettings.namespaceCustomizationInput')).toBeInTheDocument();
  });

  it('shows a duplicate error in real-time as the user types a namespace already in the list', async () => {
    const { getByTestId, getByText, queryAllByText } = renderSection({
      savedNamespaces: ['prod'],
    });

    const input = getByTestId('epmSettings.namespaceCustomizationInput').querySelector('input')!;
    await userEvent.type(input, 'prod');

    // Error appears while typing, before Enter is pressed.
    expect(getByText('Namespace is already in the list.')).toBeInTheDocument();
    // The namespace is not duplicated in the list.
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
});
