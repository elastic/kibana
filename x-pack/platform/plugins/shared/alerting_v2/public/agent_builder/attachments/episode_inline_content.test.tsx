/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ALERT_EPISODE_STATUS, EPISODE_ATTACHMENT_TYPE } from '@kbn/alerting-v2-schemas';
import { EpisodeInlineContent } from './episode_inline_content';
import { createEpisodeAttachmentDefinition } from './episode_attachment_definition';

const createAttachment = (
  overrides: { origin?: string; severity?: string; last_tags?: string[] } = {}
) => ({
  id: 'att-1',
  type: EPISODE_ATTACHMENT_TYPE,
  versions: [],
  current_version: 1,
  origin: overrides.origin ?? 'ep-1',
  data: {
    '@timestamp': '2026-04-10T12:00:00.000Z',
    'episode.id': 'ep-1',
    'episode.status': ALERT_EPISODE_STATUS.ACTIVE,
    'rule.id': 'rule-1',
    group_hash: 'gh-1',
    first_timestamp: '2026-04-10T11:00:00.000Z',
    last_timestamp: '2026-04-10T12:00:00.000Z',
    duration: 3600000,
    severity: overrides.severity,
    last_tags: overrides.last_tags,
  } as any,
});

describe('EpisodeInlineContent', () => {
  it('renders status, rule id, and tags', () => {
    render(
      <EpisodeInlineContent
        attachment={createAttachment({ severity: 'high', last_tags: ['ops'] }) as any}
        isSidebar={false}
      />
    );

    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText(/Rule: rule-1/)).toBeInTheDocument();
    expect(screen.getByText('high')).toBeInTheDocument();
    expect(screen.getByText('ops')).toBeInTheDocument();
  });
});

describe('createEpisodeAttachmentDefinition', () => {
  it('uses episode id as the label and falls back to origin', () => {
    const definition = createEpisodeAttachmentDefinition({
      container: {} as any,
    });
    expect(definition.getLabel(createAttachment() as any)).toBe('ep-1');
    expect(
      definition.getLabel({
        ...createAttachment({ origin: 'origin-only' }),
        data: undefined as any,
      } as any)
    ).toBe('origin-only');
  });
});
