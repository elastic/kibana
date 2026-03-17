/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCommandBadgeElement } from './create_badge_element';
import { CommandId } from '../command_menu/types';
import { COMMAND_BADGE_ATTRIBUTE, COMMAND_ID_ATTRIBUTE } from './attributes';

describe('createBadgeElement', () => {
  it('creates a span element', () => {
    const badge = createCommandBadgeElement({
      commandId: CommandId.Skill,
      label: 'Summarize',
      metadata: { 'skill-id': 'skill-1' },
    });

    expect(badge.tagName).toBe('SPAN');
  });

  it('sets contenteditable to false', () => {
    const badge = createCommandBadgeElement({
      commandId: CommandId.Skill,
      label: 'Summarize',
      metadata: { 'skill-id': 'skill-1' },
    });

    expect(badge.contentEditable).toBe('false');
  });

  it('sets data-command-badge attribute', () => {
    const badge = createCommandBadgeElement({
      commandId: CommandId.Skill,
      label: 'Summarize',
      metadata: { 'skill-id': 'skill-1' },
    });

    expect(badge.getAttribute(COMMAND_BADGE_ATTRIBUTE)).toBe('true');
  });

  it('sets data-command-id attribute', () => {
    const badge = createCommandBadgeElement({
      commandId: CommandId.Skill,
      label: 'Summarize',
      metadata: { 'skill-id': 'skill-1' },
    });

    expect(badge.getAttribute(COMMAND_ID_ATTRIBUTE)).toBe('skill');
  });

  it('sets metadata as data attributes', () => {
    const badge = createCommandBadgeElement({
      commandId: CommandId.Skill,
      label: 'Summarize',
      metadata: { 'skill-id': 'skill-1' },
    });

    expect(badge.getAttribute('data-skill-id')).toBe('skill-1');
  });

  it('sets text content to label', () => {
    const badge = createCommandBadgeElement({
      commandId: CommandId.Skill,
      label: 'Summarize',
      metadata: { 'skill-id': 'skill-1' },
    });

    expect(badge.textContent).toBe('Summarize');
  });

  it('handles multiple metadata entries', () => {
    const badge = createCommandBadgeElement({
      commandId: CommandId.Skill,
      label: 'Test',
      metadata: { 'skill-id': 'skill-1', version: '2' },
    });

    expect(badge.getAttribute('data-skill-id')).toBe('skill-1');
    expect(badge.getAttribute('data-version')).toBe('2');
  });
});
