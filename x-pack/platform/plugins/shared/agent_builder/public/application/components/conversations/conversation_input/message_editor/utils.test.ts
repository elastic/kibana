/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { unwrapBadge } from './utils';
import { createCommandBadgeElement } from './command_badge';
import { CommandId } from './command_menu';

describe('unwrapBadge', () => {
  const createUnmatchedBadge = () =>
    createCommandBadgeElement({
      commandId: CommandId.Sml,
      label: 'connector/nosuchthing',
      id: '',
      metadata: {},
      matched: false,
    });

  it('replaces the badge with a single text node containing its display text', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const badge = createUnmatchedBadge();
    container.appendChild(badge);

    unwrapBadge(badge);

    expect(container.contains(badge)).toBe(false);
    expect(container.childNodes).toHaveLength(1);
    expect(container.firstChild?.nodeType).toBe(Node.TEXT_NODE);
    expect(container.textContent).toBe('@connector/nosuchthing');

    document.body.removeChild(container);
  });

  it('places a collapsed cursor at the end of the restored text', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const badge = createUnmatchedBadge();
    container.appendChild(badge);

    unwrapBadge(badge);

    const sel = window.getSelection();
    expect(sel?.rangeCount).toBe(1);
    const range = sel!.getRangeAt(0);
    expect(range.collapsed).toBe(true);
    expect(range.startContainer).toBe(container.firstChild);
    expect(range.startOffset).toBe((container.firstChild as Text).length);

    document.body.removeChild(container);
  });

  it('preserves surrounding text and other nodes', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    container.appendChild(document.createTextNode('Use '));
    const badge = createUnmatchedBadge();
    container.appendChild(badge);
    container.appendChild(document.createTextNode(' please'));

    unwrapBadge(badge);

    expect(container.textContent).toBe('Use @connector/nosuchthing please');

    document.body.removeChild(container);
  });
});
