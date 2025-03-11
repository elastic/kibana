/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { FieldType } from '../../types/types';
import { SelectableProvider } from './selectable';

const providers = [
  {
    service: 'hugging_face',
    name: 'Hugging Face',
    task_types: ['text_embedding', 'sparse_embedding'],
    configurations: {
      api_key: {
        default_value: null,
        description: `API Key for the provider you're connecting to.`,
        label: 'API Key',
        required: true,
        sensitive: true,
        updatable: true,
        type: FieldType.STRING,
        supported_task_types: ['text_embedding', 'sparse_embedding'],
      },
      'rate_limit.requests_per_minute': {
        default_value: null,
        description: 'Minimize the number of rate limit errors.',
        label: 'Rate Limit',
        required: false,
        sensitive: false,
        updatable: true,
        type: FieldType.INTEGER,
        supported_task_types: ['text_embedding', 'sparse_embedding'],
      },
      url: {
        default_value: 'https://api.openai.com/v1/embeddings',
        description: 'The URL endpoint to use for the requests.',
        label: 'URL',
        required: true,
        sensitive: false,
        updatable: true,
        type: FieldType.STRING,
        supported_task_types: ['text_embedding', 'sparse_embedding'],
      },
    },
  },
];

describe('SelectableProvider', () => {
  const props = {
    providers,
    onClosePopover: jest.fn(),
    onProviderChange: jest.fn(),
  };
  describe('should render', () => {
    describe('provider', () => {
      afterAll(() => {
        jest.clearAllMocks();
      });

      test('render placeholder', async () => {
        render(<SelectableProvider {...props} />);
        const searchInput = screen.getByTestId('provider-super-select-search-box');
        expect(searchInput).toHaveAttribute('placeholder', 'Search');
      });

      test('render list of providers', async () => {
        render(<SelectableProvider {...props} />);
        const listOfProviders = screen.queryAllByRole('option');
        expect(listOfProviders).toHaveLength(1);
      });
    });
  });
});
