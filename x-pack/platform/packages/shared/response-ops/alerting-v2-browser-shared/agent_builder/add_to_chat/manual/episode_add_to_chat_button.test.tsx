/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { AlertEpisode, RuleResponse } from '@kbn/alerting-v2-schemas';
import { EpisodeAddToChatButton } from './episode_add_to_chat_button';
import { AddToChatButton } from './add_to_chat_button';

jest.mock('./add_to_chat_button', () => ({
  AddToChatButton: jest.fn(() => <div data-test-subj="addToChatButtonStub" />),
}));

const mockAddToChatButton = jest.mocked(AddToChatButton);

const mockEpisode = {
  'episode.id': 'ep-1',
  'rule.id': 'rule-1',
  episode_data: JSON.stringify({ rule_name: 'Snapshot Rule' }),
} as AlertEpisode;

const mockRule = {
  id: 'rule-1',
  metadata: { name: 'Rule A' },
  grouping: { fields: ['host.name'] },
} as RuleResponse;

describe('EpisodeAddToChatButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('packages the episode and rule for the generic add to chat button', () => {
    render(<EpisodeAddToChatButton episode={mockEpisode} rule={mockRule} />);

    expect(mockAddToChatButton).toHaveBeenCalledWith(
      expect.objectContaining({
        item: {
          episode: mockEpisode,
          ruleName: 'Rule A',
          groupingFields: ['host.name'],
        },
        'data-test-subj': 'alertingV2EpisodeAddToChatButton',
      }),
      expect.anything()
    );
    expect(screen.getByTestId('addToChatButtonStub')).toBeInTheDocument();
  });

  it('falls back to episode_data.rule_name when the rule is missing', () => {
    render(<EpisodeAddToChatButton episode={mockEpisode} />);

    expect(mockAddToChatButton).toHaveBeenCalledWith(
      expect.objectContaining({
        item: {
          episode: mockEpisode,
          ruleName: 'Snapshot Rule',
          groupingFields: undefined,
        },
      }),
      expect.anything()
    );
  });
});
