/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({ services: { docLinks: undefined } }),
}));
jest.mock('@kbn/fleet-plugin/public', () => ({
  NamespaceComboBox: ({
    namespace,
    onNamespaceChange,
    'data-test-subj': dataTestSubj,
  }: {
    namespace?: string;
    onNamespaceChange: (ns: string) => void;
    'data-test-subj'?: string;
  }) => (
    <input
      data-test-subj={dataTestSubj}
      value={namespace ?? ''}
      onChange={(e) => onNamespaceChange(e.target.value)}
    />
  ),
}));

import { SharedSettingsSection } from './shared_settings_section';

const renderSection = (props: Partial<React.ComponentProps<typeof SharedSettingsSection>> = {}) => {
  const onIntegrationNameChange = jest.fn();
  const onDescriptionChange = jest.fn();
  const onNamespaceChange = jest.fn();
  render(
    <I18nProvider>
      <SharedSettingsSection
        integrationName="aws-1"
        onIntegrationNameChange={onIntegrationNameChange}
        description=""
        onDescriptionChange={onDescriptionChange}
        globalRegion="us-east-1"
        onGlobalRegionChange={jest.fn()}
        globalRegionTouched={false}
        onGlobalRegionTouched={jest.fn()}
        namespace=""
        onNamespaceChange={onNamespaceChange}
        {...props}
      />
    </I18nProvider>
  );
  return {
    onIntegrationNameChange,
    onDescriptionChange,
    onNamespaceChange,
  };
};

describe('SharedSettingsSection', () => {
  it('shows the integration name and the description', () => {
    renderSection({ integrationName: 'my-aws', description: 'Production' });

    expect(screen.getByTestId('sharedSettingsIntegrationName')).toHaveValue('my-aws');
    expect(screen.getByTestId('sharedSettingsDescription')).toHaveValue('Production');
  });

  it('reports edits', () => {
    const { onIntegrationNameChange, onDescriptionChange } = renderSection();

    fireEvent.change(screen.getByTestId('sharedSettingsIntegrationName'), {
      target: { value: 'my-aws' },
    });
    fireEvent.change(screen.getByTestId('sharedSettingsDescription'), {
      target: { value: 'Production' },
    });

    expect(onIntegrationNameChange).toHaveBeenCalledWith('my-aws');
    expect(onDescriptionChange).toHaveBeenCalledWith('Production');
  });

  it('shows no error on a field that was not edited', () => {
    renderSection({
      integrationName: '',
      integrationNameError: 'An integration name is required.',
    });

    expect(screen.queryByText('An integration name is required.')).not.toBeInTheDocument();
  });

  it('shows the error once the field was edited', () => {
    renderSection({
      integrationName: '',
      integrationNameError: 'An integration name is required.',
    });

    fireEvent.change(screen.getByTestId('sharedSettingsIntegrationName'), {
      target: { value: ' ' },
    });

    expect(screen.getByText('An integration name is required.')).toBeInTheDocument();
  });

  describe('advanced options', () => {
    it('is collapsed by default', () => {
      renderSection();

      expect(screen.getByTestId('sharedSettingsAdvancedToggle')).toHaveAttribute(
        'aria-expanded',
        'false'
      );
      expect(screen.getByTestId('sharedSettingsNamespace')).not.toBeVisible();
    });

    it('stays collapsed when the namespace is prefilled', () => {
      renderSection({ namespace: 'prod' });

      expect(screen.getByTestId('sharedSettingsNamespace')).not.toBeVisible();
    });

    it('shows the namespace once expanded and collapses again', () => {
      renderSection({ namespace: 'prod' });

      fireEvent.click(screen.getByTestId('sharedSettingsAdvancedToggle'));
      expect(screen.getByTestId('sharedSettingsNamespace')).toHaveValue('prod');
      expect(screen.getByTestId('sharedSettingsAdvancedToggle')).toHaveAttribute(
        'aria-expanded',
        'true'
      );

      fireEvent.click(screen.getByTestId('sharedSettingsAdvancedToggle'));
      expect(screen.getByTestId('sharedSettingsNamespace')).not.toBeVisible();
    });

    it('reports namespace edits', () => {
      const { onNamespaceChange } = renderSection();

      fireEvent.click(screen.getByTestId('sharedSettingsAdvancedToggle'));
      fireEvent.change(screen.getByTestId('sharedSettingsNamespace'), {
        target: { value: 'prod' },
      });

      expect(onNamespaceChange).toHaveBeenCalledWith('prod');
    });

    it('opens on its own, and cannot be collapsed, while the namespace is invalid', () => {
      renderSection({ namespace: 'Prod', namespaceError: 'Namespace must be lowercase' });

      expect(screen.getByTestId('sharedSettingsNamespace')).toBeVisible();
      fireEvent.click(screen.getByTestId('sharedSettingsAdvancedToggle'));
      expect(screen.getByTestId('sharedSettingsNamespace')).toBeVisible();
    });

    it('notes that a change reaches deployed services only when some are deployed', () => {
      renderSection({ hasDeployedServices: true });

      fireEvent.click(screen.getByTestId('sharedSettingsAdvancedToggle'));
      expect(screen.getByTestId('sharedSettingsNamespace-note')).toBeInTheDocument();
    });

    it('has no deployed note before anything is deployed', () => {
      renderSection();

      fireEvent.click(screen.getByTestId('sharedSettingsAdvancedToggle'));
      expect(screen.queryByTestId('sharedSettingsNamespace-note')).not.toBeInTheDocument();
    });
  });
});
