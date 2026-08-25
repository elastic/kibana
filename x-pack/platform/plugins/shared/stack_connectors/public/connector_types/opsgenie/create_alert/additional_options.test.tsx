/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, render, within, fireEvent } from '@testing-library/react';
import { AdditionalOptions } from './additional_options';

describe('AdditionalOptions', () => {
  const editOptionalSubAction = jest.fn();

  const options = {
    index: 0,
    editOptionalSubAction,
  };

  beforeEach(() => jest.clearAllMocks());

  it('renders the component with empty states', () => {
    render(<AdditionalOptions {...options} />);

    expect(screen.getByTestId('opsgenie-entity-row')).toBeInTheDocument();
    expect(screen.getByTestId('opsgenie-source-row')).toBeInTheDocument();
    expect(screen.getByTestId('opsgenie-user-row')).toBeInTheDocument();
    expect(screen.getByText('Note')).toBeInTheDocument();
  });

  it('renders with the subActionParams displayed in the fields', async () => {
    render(
      <AdditionalOptions
        {...{
          ...options,
          subActionParams: {
            tags: ['super tag'],
            entity: 'entity',
            source: 'source',
            user: 'user',
            note: 'note',
          },
        }}
      />
    );

    expect(
      within(screen.getByTestId('opsgenie-entity-row')).getByDisplayValue('entity')
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('opsgenie-entity-row')).getByDisplayValue('entity')
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('opsgenie-source-row')).getByDisplayValue('source')
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('opsgenie-user-row')).getByDisplayValue('user')
    ).toBeInTheDocument();
    expect(within(screen.getByTestId('noteTextArea')).getByText('note')).toBeInTheDocument();
  });

  it.each([
    ['entity', 'entityInput', 'an entity'],
    ['source', 'sourceInput', 'a source'],
    ['user', 'userInput', 'a user'],
    ['note', 'noteTextArea', 'a note'],
  ])(
    'calls the callback for field %s data-test-subj %s with input %s',
    (field, dataTestSubj, input) => {
      render(<AdditionalOptions {...options} />);

      fireEvent.change(screen.getByTestId(dataTestSubj), { target: { value: input } });

      expect(editOptionalSubAction.mock.calls[0]).toEqual([field, input, 0]);
    }
  );
});
