/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';

import { TestProviders } from '../../../mock/test_providers/test_providers';
import { AnonymizationSettings } from '.';
import type { Props } from '.';

const props: Props = {
  defaultPageSize: 5,
  anonymizationFields: {
    total: 4,
    page: 1,
    perPage: 1000,
    data: [
      {
        field: 'foo',
        id: 'test',
        allowed: true,
        anonymized: false,
        createdAt: '',
        timestamp: '',
      },
      {
        field: 'bar',
        id: 'test1',
        allowed: true,
        anonymized: true,
        createdAt: '',
        timestamp: '',
      },
      {
        field: 'baz',
        id: 'test2',
        allowed: true,
        anonymized: false,
        createdAt: '',
        timestamp: '',
      },
      {
        field: '@baz',
        id: 'test3',
        allowed: true,
        anonymized: false,
        createdAt: '',
        timestamp: '',
      },
    ],
  },
  setAnonymizationFieldsBulkActions: jest.fn(),
  setUpdatedAnonymizationData: jest.fn(),
  anonymizationFieldsBulkActions: {},
};

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
  assistantAvailability: {
    hasUpdateAIAssistantAnonymization: true,
  },
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
  beforeEach(() => jest.clearAllMocks());

  it('renders the editor', () => {
    const { getByTestId } = render(
      <TestProviders>
        <AnonymizationSettings {...props} />
      </TestProviders>
    );

    expect(getByTestId('contextEditor')).toBeInTheDocument();
  });

  it('renders the expected allowed stat content', () => {
    const { getByTestId } = render(
      <TestProviders>
        <AnonymizationSettings {...props} />
      </TestProviders>
    );

    expect(getByTestId('allowedStat')).toHaveTextContent(
      `${mockUseAssistantContext.defaultAllow.length}Allowed`
    );
  });

  it('renders the expected anonymized stat content', () => {
    const { getByTestId } = render(
      <TestProviders>
        <AnonymizationSettings {...props} />
      </TestProviders>
    );

    expect(getByTestId('anonymizedFieldsStat')).toHaveTextContent(
      `${mockUseAssistantContext.defaultAllowReplacement.length}Anonymized`
    );
  });
});
