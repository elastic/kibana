/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ConfigurationFormItems } from './configuration_form_items';
import { render, screen } from '@testing-library/react';
import { FieldType } from '../../types/dynamic_config/types';

describe('ConfigurationFormItems', () => {
  const mockItems = [
    {
      key: 'model_id',
      isValid: true,
      label: 'Model ID',
      description: 'Enter model ID',
      validationErrors: [],
      required: true,
      sensitive: false,
      value: '',
      default_value: '',
      updatable: false,
      type: FieldType.STRING,
      supported_task_types: ['text_embedding'],
    },
  ];

  const defaultProps = {
    isLoading: false,
    items: mockItems,
    setConfigEntry: jest.fn(),
  };

  it('renders link when isInternalProvider is true and key is model_id', () => {
    render(<ConfigurationFormItems {...defaultProps} isInternalProvider={true} />);

    const link = screen.getByRole('link', { name: /Learn more./i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute(
      'href',
      'https://www.elastic.co/guide/en/elasticsearch/reference/current/inference-apis.html#default-enpoints'
    );

    expect(screen.getByTestId('model_id-input')).toBeInTheDocument();
  });

  it('does not renders link when isInternalProvider is true and key is  model_id', () => {
    const numAllocations = [
      {
        key: 'num_allocations',
        isValid: true,
        label: 'Number Allocations',
        description:
          'The total number of allocations this model is assigned across machine learning nodes.',
        validationErrors: [],
        required: true,
        sensitive: false,
        value: '',
        default_value: 1,
        updatable: true,
        type: FieldType.INTEGER,
        supported_task_types: ['text_embedding'],
      },
    ];

    const props = {
      isLoading: false,
      items: numAllocations,
      setConfigEntry: jest.fn(),
    };

    render(<ConfigurationFormItems {...props} isInternalProvider={true} />);

    const link = screen.queryByRole('link', { name: /looking for elasticsearch model ids/i });
    expect(link).not.toBeInTheDocument();
  });

  it('does not renders link when isInternalProvider is false and key is model_id', () => {
    render(<ConfigurationFormItems {...defaultProps} isInternalProvider={false} />);

    const link = screen.queryByRole('link', { name: /looking for elasticsearch model ids/i });
    expect(link).not.toBeInTheDocument();
  });
});
