/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { useConversationStream } from '../../../hooks/use_conversation_stream';
import { RoundsScreenReaderStatus } from './rounds_screen_reader_status';

jest.mock('../../../hooks/use_conversation_stream', () => ({
  useConversationStream: jest.fn(),
}));

const setLoading = (isResponseLoading: boolean) =>
  jest
    .mocked(useConversationStream)
    .mockReturnValue({ isResponseLoading } as ReturnType<typeof useConversationStream>);

const responseRegion = () => screen.getAllByRole('status')[1];

describe('RoundsScreenReaderStatus', () => {
  it('announces the response once loading ends and keeps the text stable across rerenders', () => {
    setLoading(true);
    const { rerender } = render(<RoundsScreenReaderStatus responseMessage="Hel" />);
    expect(responseRegion()).toHaveTextContent('');

    setLoading(false);
    rerender(<RoundsScreenReaderStatus responseMessage="Hello there" />);
    expect(responseRegion()).toHaveTextContent('Agent said: Hello there');

    rerender(<RoundsScreenReaderStatus responseMessage="Hello there" />);
    expect(responseRegion()).toHaveTextContent('Agent said: Hello there');
  });

  it('announces nothing when the last turn has no response', () => {
    setLoading(true);
    const { rerender } = render(<RoundsScreenReaderStatus />);

    setLoading(false);
    rerender(<RoundsScreenReaderStatus />);
    expect(responseRegion()).toHaveTextContent('');
  });
});
