/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { RoundInput } from './round_input';
import { RoundResponseActions } from './round_response/round_response_actions';

jest.mock('./round_response/round_response_actions', () => ({
  RoundResponseActions: jest.fn(() => null),
}));
jest.mock('./round_attachment_references', () => ({
  RoundAttachmentReferences: () => null,
}));
jest.mock('./round_input_text', () => ({
  RoundInputText: () => null,
}));

const MockRoundResponseActions = jest.mocked(RoundResponseActions);

describe('RoundInput', () => {
  beforeEach(() => {
    MockRoundResponseActions.mockClear();
  });

  it('tells RoundResponseActions to copy the prompt, not the response', () => {
    render(<RoundInput input="hello agent" />);

    const [props] = MockRoundResponseActions.mock.calls[0];
    expect(props.content).toBe('hello agent');
    expect(props.copyTarget).toBe('prompt');
  });
});
