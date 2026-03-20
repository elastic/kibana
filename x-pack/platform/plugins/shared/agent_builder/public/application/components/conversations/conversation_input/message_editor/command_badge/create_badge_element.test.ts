/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCommandBadgeElement } from './create_badge_element';
import { CommandId } from '../command_menu/types';
import {
  COMMAND_BADGE_ATTRIBUTE,
  COMMAND_ID_ATTRIBUTE,
  COMMAND_METADATA_ATTRIBUTE,
} from './attributes';

describe('createBadgeElement', () => {
  it('creates a span element', () => {
    const badge = createCommandBadgeElement({
      commandId: CommandId.Skill,
      label: 'Summarize',
      id: 'skill-1',
      metadata: {},
    });

    expect(badge.tagName).toBe('SPAN');
  });

  it('sets contenteditable to false', () => {
    const badge = createCommandBadgeElement({
      commandId: CommandId.Skill,
      label: 'Summarize',
      id: 'skill-1',
      metadata: {},
    });

    expect(badge.contentEditable).toBe('false');
  });

  it('sets data-command-badge attribute', () => {
    const badge = createCommandBadgeElement({
      commandId: CommandId.Skill,
      label: 'Summarize',
      id: 'skill-1',
      metadata: {},
    });

    expect(badge.getAttribute(COMMAND_BADGE_ATTRIBUTE)).toBe('true');
  });

  it('sets data-command-id attribute', () => {
    const badge = createCommandBadgeElement({
      commandId: CommandId.Skill,
      label: 'Summarize',
      id: 'skill-1',
      metadata: {},
    });

    expect(badge.getAttribute(COMMAND_ID_ATTRIBUTE)).toBe('skill');
  });

  it('sets data-command-metadata as JSON with id', () => {
    const badge = createCommandBadgeElement({
      commandId: CommandId.Skill,
      label: 'Summarize',
      id: 'skill-1',
      metadata: {},
    });

    const parsed = JSON.parse(badge.getAttribute(COMMAND_METADATA_ATTRIBUTE)!);
    expect(parsed).toEqual({ id: 'skill-1' });
  });

  it('sets text content to command sequence followed by label', () => {
    const badge = createCommandBadgeElement({
      commandId: CommandId.Skill,
      label: 'Summarize',
      id: 'skill-1',
      metadata: {},
    });

    expect(badge.textContent).toBe('/Summarize');
  });

  it('handles multiple metadata entries', () => {
    const badge = createCommandBadgeElement({
      commandId: CommandId.Skill,
      label: 'Test',
      id: 'skill-1',
      metadata: { version: '2' },
    });

    const parsed = JSON.parse(badge.getAttribute(COMMAND_METADATA_ATTRIBUTE)!);
    expect(parsed).toEqual({ id: 'skill-1', version: '2' });
  });
});
