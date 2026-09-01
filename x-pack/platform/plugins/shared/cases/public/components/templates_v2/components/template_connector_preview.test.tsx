/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { CaseConnectorWithoutName } from '../../../../common/types/domain_zod/connector/v1';
import { ConnectorTypes } from '../../../../common/types/domain';
import { useGetSupportedActionConnectors } from '../../../containers/configure/use_get_supported_action_connectors';
import { TemplateConnectorPreview } from './template_connector_preview';

jest.mock('../../../containers/configure/use_get_supported_action_connectors');
jest.mock('../../connectors/fields_preview_form', () => ({
  ConnectorFieldsPreviewForm: ({
    connector,
    fields,
  }: {
    connector: { name: string };
    fields: unknown;
  }) => (
    <div data-test-subj="mock-fields-preview-form">{`${connector?.name}:${JSON.stringify(
      fields
    )}`}</div>
  ),
}));

const useGetSupportedActionConnectorsMock = useGetSupportedActionConnectors as jest.Mock;

const jiraConnector = {
  type: ConnectorTypes.jira,
  id: 'jira-1',
  fields: { issueType: '10001', priority: 'High', parent: null },
} as CaseConnectorWithoutName;

describe('TemplateConnectorPreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows a loading state while connectors are loading', () => {
    useGetSupportedActionConnectorsMock.mockReturnValue({ data: undefined, isLoading: true });

    render(<TemplateConnectorPreview connector={jiraConnector} />);

    expect(screen.getByText('Connector')).toBeInTheDocument();
    expect(screen.queryByTestId('template-connector-preview-not-found')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mock-fields-preview-form')).not.toBeInTheDocument();
  });

  it('shows a fallback message when the connector id cannot be resolved', () => {
    useGetSupportedActionConnectorsMock.mockReturnValue({ data: [], isLoading: false });

    render(<TemplateConnectorPreview connector={jiraConnector} />);

    expect(screen.getByTestId('template-connector-preview-not-found')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-fields-preview-form')).not.toBeInTheDocument();
  });

  it('renders the shared connector fields preview with the resolved connector and template fields', () => {
    useGetSupportedActionConnectorsMock.mockReturnValue({
      data: [{ id: 'jira-1', name: 'My Jira', actionTypeId: ConnectorTypes.jira }],
      isLoading: false,
    });

    render(<TemplateConnectorPreview connector={jiraConnector} />);

    const preview = screen.getByTestId('mock-fields-preview-form');
    expect(preview).toHaveTextContent('My Jira');
    expect(preview).toHaveTextContent('10001');
    expect(screen.queryByTestId('template-connector-preview-not-found')).not.toBeInTheDocument();
  });
});
