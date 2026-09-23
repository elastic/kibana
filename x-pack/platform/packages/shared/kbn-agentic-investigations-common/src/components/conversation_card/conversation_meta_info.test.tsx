/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, screen } from '@testing-library/react';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import { ConversationMetaInfo } from './conversation_meta_info';

const agedBy = (ms: number) => new Date(Date.now() - ms).toISOString();

describe('ConversationMetaInfo', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('ages on its own, without the card re-rendering', () => {
    renderWithKibanaRenderContext(<ConversationMetaInfo createdAt={agedBy(90 * 1000)} />);

    expect(screen.getByText('1 minute ago')).toBeInTheDocument();

    act(() => jest.advanceTimersByTime(60 * 1000));

    expect(screen.getByText('2 minutes ago')).toBeInTheDocument();
  });

  it('renders an age react-intl refuses to schedule updates for', () => {
    renderWithKibanaRenderContext(
      <ConversationMetaInfo createdAt={agedBy(2 * 24 * 3600 * 1000)} />
    );

    expect(screen.getByText('2 days ago')).toBeInTheDocument();
  });
});
