/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { replyToSpec, stripAttachmentTags } from './reply_to_spec';

describe('replyToSpec', () => {
  it('converts markdown into a markdown node', () => {
    expect(replyToSpec('There are **3** open alerts.')).toEqual({
      type: 'view',
      body: [{ type: 'markdown', text: 'There are **3** open alerts.' }],
    });
  });

  it('converts tags into attachment nodes at their position', () => {
    const message = [
      'Here is the query:',
      '<render_attachment id="a1" version="2" />',
      'And the chart:',
      '<render_attachment id="a2"/>',
    ].join('\n\n');

    expect(replyToSpec(message)?.body).toEqual([
      { type: 'markdown', text: 'Here is the query:' },
      { type: 'attachment', attachmentId: 'a1', version: 2 },
      { type: 'markdown', text: 'And the chart:' },
      { type: 'attachment', attachmentId: 'a2' },
    ]);
  });

  it('splits tags inline with prose', () => {
    expect(replyToSpec('Rule: <render_attachment id="a1" version="1"/> done')?.body).toEqual([
      { type: 'markdown', text: 'Rule:' },
      { type: 'attachment', attachmentId: 'a1', version: 1 },
      { type: 'markdown', text: 'done' },
    ]);
  });

  it('omits versions that are not positive integers', () => {
    expect(replyToSpec('<render_attachment id="a1" version="latest" />')?.body).toEqual([
      { type: 'attachment', attachmentId: 'a1' },
    ]);
    expect(replyToSpec('<render_attachment id="a1" version="0" />')?.body).toEqual([
      { type: 'attachment', attachmentId: 'a1' },
    ]);
  });

  it('does not take the id from a longer attribute name', () => {
    expect(replyToSpec('<render_attachment field-id="x" id="a1" />')?.body).toEqual([
      { type: 'attachment', attachmentId: 'a1' },
    ]);
  });

  it('drops tags without an id', () => {
    expect(replyToSpec('Hello <render_attachment version="1" />')?.body).toEqual([
      { type: 'markdown', text: 'Hello' },
    ]);
  });

  it('returns nothing for an empty reply', () => {
    expect(replyToSpec('')).toBeUndefined();
    expect(replyToSpec(' \n<render_attachment />\n ')).toBeUndefined();
  });
});

describe('stripAttachmentTags', () => {
  it('removes the tags of a reply', () => {
    expect(stripAttachmentTags('Here:\n\n<render_attachment id="a1" version="1" />')).toBe('Here:');
  });
});
