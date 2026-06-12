/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TextFieldWithMessageVariables } from './text_field_with_message_variables';

describe('TextFieldWithMessageVariables', () => {
  const editAction = jest.fn();
  const props = {
    messageVariables: [
      {
        name: 'myVar',
        description: 'My variable description',
      },
    ],
    paramsProperty: 'foo',
    index: 0,
    editAction,
    label: 'label',
  };

  beforeEach(() => jest.resetAllMocks());

  test('renders variables with double braces by default', async () => {
    render(<TextFieldWithMessageVariables {...props} />);

    await userEvent.click(screen.getByTestId('fooAddVariableButton'));
    await userEvent.click(screen.getByTestId('variableMenuButton-myVar'));

    expect(editAction).toHaveBeenCalledTimes(1);
    expect(editAction).toHaveBeenCalledWith(props.paramsProperty, '{{myVar}}', props.index);
  });

  test('renders variables with triple braces when specified', async () => {
    render(
      <TextFieldWithMessageVariables
        {...props}
        messageVariables={[
          {
            name: 'myVar',
            description: 'My variable description',
            useWithTripleBracesInTemplates: true,
          },
        ]}
      />
    );

    await userEvent.click(screen.getByTestId('fooAddVariableButton'));
    await userEvent.click(screen.getByTestId('variableMenuButton-myVar'));

    expect(editAction).toHaveBeenCalledTimes(1);
    expect(editAction).toHaveBeenCalledWith(props.paramsProperty, '{{{myVar}}}', props.index);
  });
});
