/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithTestingProviders } from '../../../common/mock';
import { TemplateConfigurationTab } from './template_configuration_tab';

const mockMetadataForm = jest.fn((_props?: unknown) => <div data-test-subj="mockMetadataForm" />);
const mockSettingsForm = jest.fn((_props?: unknown) => <div data-test-subj="mockSettingsForm" />);

jest.mock('./template_metadata_form', () => ({
  TemplateMetadataForm: (props: unknown) => mockMetadataForm(props),
}));
jest.mock('./template_settings_form', () => ({
  TemplateSettingsForm: (props: unknown) => mockSettingsForm(props),
}));

describe('TemplateConfigurationTab', () => {
  const defaultProps = {
    metadata: { name: 'Template', description: '', tags: [] },
    metadataErrors: {},
    onMetadataChange: jest.fn(),
    settings: { syncAlerts: true, extractObservables: true },
    connector: undefined,
    onSettingsChange: jest.fn(),
    onConnectorChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the identity (metadata) and settings/connector forms', () => {
    renderWithTestingProviders(<TemplateConfigurationTab {...defaultProps} />);

    expect(screen.getByTestId('templateConfigurationTab')).toBeInTheDocument();
    expect(screen.getByTestId('mockMetadataForm')).toBeInTheDocument();
    expect(screen.getByTestId('mockSettingsForm')).toBeInTheDocument();
  });

  it('passes metadata, errors, and the change handler to the metadata form (compact)', () => {
    renderWithTestingProviders(
      <TemplateConfigurationTab {...defaultProps} metadataErrors={{ name: 'required' }} />
    );

    expect(mockMetadataForm).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: defaultProps.metadata,
        errors: { name: 'required' },
        onChange: defaultProps.onMetadataChange,
        compact: true,
      })
    );
  });

  it('passes settings, connector, and handlers to the settings form (compact)', () => {
    renderWithTestingProviders(<TemplateConfigurationTab {...defaultProps} />);

    expect(mockSettingsForm).toHaveBeenCalledWith(
      expect.objectContaining({
        settings: defaultProps.settings,
        connector: undefined,
        onSettingsChange: defaultProps.onSettingsChange,
        onConnectorChange: defaultProps.onConnectorChange,
        compact: true,
      })
    );
  });
});
