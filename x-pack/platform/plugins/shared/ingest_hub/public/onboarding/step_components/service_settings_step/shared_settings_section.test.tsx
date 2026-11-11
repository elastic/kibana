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
const mockUseOutputs = jest.fn();
jest.mock('@kbn/fleet-plugin/public', () => ({
  useOutputs: (...args: unknown[]) => mockUseOutputs(...args),
  PackagePolicyOutputSelect: jest.requireActual(
    '@kbn/fleet-plugin/public/applications/fleet/sections/agent_policy/create_package_policy_page/components/steps/components/package_policy_output_select'
  ).PackagePolicyOutputSelect,
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
  beforeEach(() => {
    mockUseOutputs.mockReturnValue({
      isLoading: false,
      canUseOutputPerIntegration: true,
      allowedOutputs: [{ id: 'logstash-1', name: 'My Logstash' }],
      inheritedOutputName: 'Default',
    });
  });

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

    it('notes that a launched ECF stack has to be updated in AWS', () => {
      renderSection({ hasLaunchedEcfStack: true });

      fireEvent.click(screen.getByTestId('sharedSettingsAdvancedToggle'));
      expect(screen.getByTestId('sharedSettingsNamespace-note')).toHaveTextContent(
        'A launched CloudFormation stack takes the new value once you update it in AWS.'
      );
    });

    it('notes that some selected services do not use the namespace', () => {
      renderSection({ hasServicesIgnoringNamespace: true });

      fireEvent.click(screen.getByTestId('sharedSettingsAdvancedToggle'));
      expect(screen.getByTestId('sharedSettingsNamespace-note')).toHaveTextContent(
        'does not use this setting'
      );
    });

    it('has no deployed note before anything is deployed', () => {
      renderSection();

      fireEvent.click(screen.getByTestId('sharedSettingsAdvancedToggle'));
      expect(screen.queryByTestId('sharedSettingsNamespace-note')).not.toBeInTheDocument();
    });
  });

  describe('output', () => {
    const outputProps = (
      overrides: Partial<
        NonNullable<React.ComponentProps<typeof SharedSettingsSection>['output']>
      > = {}
    ) => ({
      value: '',
      onChange: jest.fn(),
      packageName: 'aws',
      inputTypes: ['aws-s3'],
      areInputTypesLoaded: true,
      isInheritedOutputDefault: true,
      ...overrides,
    });

    it('is hidden unless the deployment is agent-based', () => {
      renderSection();

      expect(screen.queryByTestId('sharedSettingsOutput')).not.toBeInTheDocument();
    });

    it('offers the inherited output and the allowed ones', () => {
      renderSection({ output: outputProps() });

      const select = screen.getByTestId('sharedSettingsOutput');
      expect(select).toHaveValue('');
      expect(
        screen.getByText('Inherited from agent policy (currently Default)')
      ).toBeInTheDocument();
      expect(screen.getByText('My Logstash')).toBeInTheDocument();
    });

    it('does not name the inherited output when the agent policies may set their own', () => {
      renderSection({ output: outputProps({ isInheritedOutputDefault: false }) });

      expect(screen.getByText('Inherited from agent policy')).toBeInTheDocument();
      expect(
        screen.queryByText('Inherited from agent policy (currently Default)')
      ).not.toBeInTheDocument();
    });

    it('offers the outputs the input types of the selected services accept', () => {
      renderSection({ output: outputProps({ inputTypes: ['otelcol'] }) });

      expect(mockUseOutputs).toHaveBeenCalledWith(
        { inputs: [{ type: 'otelcol', enabled: true }] },
        'aws'
      );
    });

    it('falls back to the inherited output when the chosen one is no longer allowed', () => {
      const onChange = jest.fn();
      // e.g. an OTel service was added after a Logstash output was chosen.
      mockUseOutputs.mockReturnValue({
        isLoading: false,
        canUseOutputPerIntegration: true,
        allowedOutputs: [{ id: 'es-1', name: 'Elasticsearch' }],
        inheritedOutputName: 'Default',
      });
      renderSection({ output: outputProps({ value: 'logstash-1', onChange }) });

      expect(onChange).toHaveBeenCalledWith('');
    });

    it('keeps the chosen output while the outputs are loading', () => {
      const onChange = jest.fn();
      mockUseOutputs.mockReturnValue({
        isLoading: true,
        canUseOutputPerIntegration: true,
        allowedOutputs: [],
        inheritedOutputName: undefined,
      });
      renderSection({ output: outputProps({ value: 'logstash-1', onChange }) });

      expect(onChange).not.toHaveBeenCalled();
    });

    it('keeps the chosen output while the manifests of the selected services are loading', () => {
      const onChange = jest.fn();
      // Without the manifests only Beats outputs are allowed, which would drop a valid OTLP choice.
      mockUseOutputs.mockReturnValue({
        isLoading: false,
        canUseOutputPerIntegration: true,
        allowedOutputs: [{ id: 'es-1', name: 'Elasticsearch' }],
        inheritedOutputName: 'Default',
      });
      renderSection({
        output: outputProps({
          value: 'otlp-1',
          onChange,
          inputTypes: [],
          areInputTypesLoaded: false,
        }),
      });

      expect(onChange).not.toHaveBeenCalled();
    });

    it('reports the chosen output', () => {
      const onChange = jest.fn();
      renderSection({ output: outputProps({ onChange }) });

      fireEvent.change(screen.getByTestId('sharedSettingsOutput'), {
        target: { value: 'logstash-1' },
      });

      expect(onChange).toHaveBeenCalledWith('logstash-1');
    });

    it('is hidden when the license does not allow an output per integration', () => {
      mockUseOutputs.mockReturnValue({
        isLoading: false,
        canUseOutputPerIntegration: false,
        allowedOutputs: [],
        inheritedOutputName: undefined,
      });
      renderSection({ output: outputProps() });

      expect(screen.queryByTestId('sharedSettingsOutput')).not.toBeInTheDocument();
    });

    it('keeps a stored output while the license is not known', () => {
      const onChange = jest.fn();
      mockUseOutputs.mockReturnValue({
        isLoading: false,
        canUseOutputPerIntegration: false,
        isLicenseKnown: false,
        allowedOutputs: [],
        inheritedOutputName: undefined,
      });
      renderSection({ output: outputProps({ value: 'logstash-1', onChange }) });

      expect(onChange).not.toHaveBeenCalled();
    });

    it('clears a stored output below the license, where the field cannot reset it', () => {
      const onChange = jest.fn();
      mockUseOutputs.mockReturnValue({
        isLoading: false,
        canUseOutputPerIntegration: false,
        isLicenseKnown: true,
        allowedOutputs: [],
        inheritedOutputName: undefined,
      });
      renderSection({ output: outputProps({ value: 'logstash-1', onChange }) });

      expect(onChange).toHaveBeenCalledWith('');
    });
  });
});
