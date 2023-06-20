/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';

import { TestProviders } from '../../../mock/test_providers/test_providers';
import { AnonymizationSettings } from '.';

const mockUseAssistantContext = {
  allSystemPrompts: [
    {
      id: 'default-system-prompt',
      content: 'default',
      name: 'default',
      promptType: 'system',
      isDefault: true,
      isNewConversationDefault: true,
    },
    {
      id: 'CB9FA555-B59F-4F71-AFF9-8A891AC5BC28',
      content: 'superhero',
      name: 'superhero',
      promptType: 'system',
      isDefault: true,
    },
  ],
  baseAllow: ['@timestamp', 'event.category', 'user.name'],
  baseAllowReplacement: ['user.name', 'host.ip'],
  defaultAllow: ['foo', 'bar', 'baz', '@baz'],
  defaultAllowReplacement: ['bar'],
  setAllSystemPrompts: jest.fn(),
  setDefaultAllow: jest.fn(),
  setDefaultAllowReplacement: jest.fn(),
};
jest.mock('../../../assistant_context', () => {
  const original = jest.requireActual('../../../assistant_context');

  return {
    ...original,
    useAssistantContext: () => mockUseAssistantContext,
  };
});

describe('AnonymizationSettings', () => {
  const closeModal = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  it('renders the editor', () => {
    const { getByTestId } = render(
      <TestProviders>
        <AnonymizationSettings />
      </TestProviders>
    );

    expect(getByTestId('contextEditor')).toBeInTheDocument();
  });

  it('does NOT call `setDefaultAllow` when `Reset` is clicked, because only local state is reset until the user clicks save', () => {
    const { getByTestId } = render(
      <TestProviders>
        <AnonymizationSettings />
      </TestProviders>
    );

    fireEvent.click(getByTestId('reset'));

    expect(mockUseAssistantContext.setDefaultAllow).not.toHaveBeenCalled();
  });

  it('does NOT call `setDefaultAllowReplacement` when `Reset` is clicked, because only local state is reset until the user clicks save', () => {
    const { getByTestId } = render(
      <TestProviders>
        <AnonymizationSettings />
      </TestProviders>
    );

    fireEvent.click(getByTestId('reset'));

    expect(mockUseAssistantContext.setDefaultAllowReplacement).not.toHaveBeenCalled();
  });

  it('renders the expected allowed stat content', () => {
    const { getByTestId } = render(
      <TestProviders>
        <AnonymizationSettings />
      </TestProviders>
    );

    expect(getByTestId('allowedStat')).toHaveTextContent(
      `${mockUseAssistantContext.defaultAllow.length}Allowed`
    );
  });

  it('renders the expected anonymized stat content', () => {
    const { getByTestId } = render(
      <TestProviders>
        <AnonymizationSettings />
      </TestProviders>
    );

    expect(getByTestId('anonymizedFieldsStat')).toHaveTextContent(
      `${mockUseAssistantContext.defaultAllowReplacement.length}Anonymized`
    );
  });

  it('calls closeModal is called when the cancel button is clicked', () => {
    const { getByTestId } = render(
      <TestProviders>
        <AnonymizationSettings closeModal={closeModal} />
      </TestProviders>
    );
    fireEvent.click(getByTestId('cancel'));
    expect(closeModal).toHaveBeenCalledTimes(1);
  });

  it('calls closeModal is called when the save button is clicked', () => {
    const { getByTestId } = render(
      <TestProviders>
        <AnonymizationSettings closeModal={closeModal} />
      </TestProviders>
    );
    fireEvent.click(getByTestId('cancel'));
    expect(closeModal).toHaveBeenCalledTimes(1);
  });

  it('calls setDefaultAllow with the expected values when the save button is clicked', () => {
    const { getByTestId } = render(
      <TestProviders>
        <AnonymizationSettings closeModal={closeModal} />
      </TestProviders>
    );

    fireEvent.click(getByTestId('save'));

    expect(mockUseAssistantContext.setDefaultAllow).toHaveBeenCalledWith(
      mockUseAssistantContext.defaultAllow
    );
  });

  it('calls setDefaultAllowReplacement with the expected values when the save button is clicked', () => {
    const { getByTestId } = render(
      <TestProviders>
        <AnonymizationSettings closeModal={closeModal} />
      </TestProviders>
    );

    fireEvent.click(getByTestId('save'));

    expect(mockUseAssistantContext.setDefaultAllowReplacement).toHaveBeenCalledWith(
      mockUseAssistantContext.defaultAllowReplacement
    );
  });
});
