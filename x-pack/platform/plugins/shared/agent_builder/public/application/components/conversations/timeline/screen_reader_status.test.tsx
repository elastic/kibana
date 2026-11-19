/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { useConversationStream } from '../../../hooks/use_conversation_stream';
import { TimelineScreenReaderStatus } from './screen_reader_status';

jest.mock('../../../hooks/use_conversation_stream', () => ({
  useConversationStream: jest.fn(),
}));

const setLoading = (isResponseLoading: boolean) =>
  jest
    .mocked(useConversationStream)
    .mockReturnValue({ isResponseLoading } as ReturnType<typeof useConversationStream>);

const responseRegion = () => screen.getAllByRole('status')[1];

describe('TimelineScreenReaderStatus', () => {
  it('announces the response once loading ends and keeps the text stable across rerenders', () => {
    setLoading(true);
    const { rerender } = render(<TimelineScreenReaderStatus responseMessage="Hel" />);
    expect(responseRegion()).toHaveTextContent('');

    setLoading(false);
    rerender(<TimelineScreenReaderStatus responseMessage="Hello there" />);
    expect(responseRegion()).toHaveTextContent('Agent said: Hello there');

    rerender(<TimelineScreenReaderStatus responseMessage="Hello there" />);
    expect(responseRegion()).toHaveTextContent('Agent said: Hello there');
  });

  it('announces nothing when the last turn has no response', () => {
    setLoading(true);
    const { rerender } = render(<TimelineScreenReaderStatus />);

    setLoading(false);
    rerender(<TimelineScreenReaderStatus />);
    expect(responseRegion()).toHaveTextContent('');
  });
});
