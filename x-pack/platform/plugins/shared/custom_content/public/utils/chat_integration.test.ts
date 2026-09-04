/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE } from '../../common/panel_context_attachment';
import { buildCustomContentContextAttachment } from './chat_integration';

describe('buildCustomContentContextAttachment', () => {
  it('carries the panel state and type', () => {
    const attachment = buildCustomContentContextAttachment(
      '<div>hi</div>',
      'FROM logs',
      'panel-1',
      'My panel'
    );

    expect(attachment.type).toBe(CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE);
    expect(attachment.data).toEqual({
      panel_template: '<div>hi</div>',
      esql_query: 'FROM logs',
      panel_title: 'My panel',
      embeddable_id: 'panel-1',
    });
  });

  // Without a stable id each push appends a new attachment, and the update tool reads the first
  // match by type — i.e. the stalest snapshot — instead of the panel's current state.
  it('derives a stable id from the embeddable id so re-pushes replace rather than accumulate', () => {
    const first = buildCustomContentContextAttachment('<div>v1</div>', 'FROM logs', 'panel-1');
    const second = buildCustomContentContextAttachment('<div>v2</div>', 'FROM metrics', 'panel-1');

    expect(first.id).toBe(`${CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE}-panel-1`);
    expect(second.id).toBe(first.id);
  });

  it('gives different panels different ids', () => {
    const a = buildCustomContentContextAttachment('', undefined, 'panel-1');
    const b = buildCustomContentContextAttachment('', undefined, 'panel-2');

    expect(a.id).not.toBe(b.id);
  });

  it('carries the panel time range so the chat preview matches what the user was looking at', () => {
    const attachment = buildCustomContentContextAttachment(
      '<div>hi</div>',
      'FROM logs',
      'panel-1',
      'My panel',
      { from: 'now-7d', to: 'now' }
    );

    expect(attachment.data?.time_range).toEqual({ from: 'now-7d', to: 'now' });
  });

  it('omits time_range entirely when the panel has no resolved range', () => {
    const attachment = buildCustomContentContextAttachment('<div>hi</div>', 'FROM logs', 'panel-1');

    expect(attachment.data).not.toHaveProperty('time_range');
  });
});
