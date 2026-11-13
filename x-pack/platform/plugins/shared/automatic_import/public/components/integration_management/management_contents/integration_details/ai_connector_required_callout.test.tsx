/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { useAiConnectors } from '../../../../common/hooks/use_ai_connectors';
import { AiConnectorRequiredCallout } from './ai_connector_required_callout';

jest.mock('../../../../common/hooks/use_ai_connectors', () => ({
  useAiConnectors: jest.fn(),
}));
const mockUseAiConnectors = useAiConnectors as jest.Mock;

jest.mock('../../../../common/components/add_ai_connector_button', () => ({
  AddAiConnectorButton: () => (
    <button type="button" data-test-subj="addNewConnectorButton">
      {'Add AI connector'}
    </button>
  ),
}));

const renderCallout = () =>
  render(
    <I18nProvider>
      <AiConnectorRequiredCallout />
    </I18nProvider>
  );

describe('AiConnectorRequiredCallout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('is hidden while connectors are loading', () => {
    mockUseAiConnectors.mockReturnValue({ data: undefined, isLoading: true });

    const { queryByTestId } = renderCallout();

    expect(queryByTestId('aiConnectorRequiredCallout')).not.toBeInTheDocument();
  });

  it('is hidden when a connector exists', () => {
    mockUseAiConnectors.mockReturnValue({ data: [{ id: 'connector-1' }], isLoading: false });

    const { queryByTestId } = renderCallout();

    expect(queryByTestId('aiConnectorRequiredCallout')).not.toBeInTheDocument();
  });

  it('is shown when no connectors exist', () => {
    mockUseAiConnectors.mockReturnValue({ data: [], isLoading: false });

    const { getByTestId } = renderCallout();

    const callout = getByTestId('aiConnectorRequiredCallout');
    expect(callout).toHaveTextContent('Add an AI connector');
    expect(callout).toHaveTextContent(
      'A connector is needed to analyze your log samples and build the ingest pipeline'
    );
    expect(getByTestId('addNewConnectorButton')).toBeInTheDocument();
  });
});
