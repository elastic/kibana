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

  it('drops tags, splitting the markdown around them', () => {
    const message = [
      'Here is the query:',
      '<render_attachment id="a1" version="2" />',
      'And the chart: <render_attachment id="a2"/> done',
    ].join('\n\n');

    expect(replyToSpec(message)?.body).toEqual([
      { type: 'markdown', text: 'Here is the query:' },
      { type: 'markdown', text: 'And the chart:' },
      { type: 'markdown', text: 'done' },
    ]);
  });

  it('returns nothing for an empty reply', () => {
    expect(replyToSpec('')).toBeUndefined();
    expect(replyToSpec(' \n<render_attachment id="a1" />\n ')).toBeUndefined();
  });
});

describe('stripAttachmentTags', () => {
  it('removes the tags of a reply', () => {
    expect(stripAttachmentTags('Here:\n\n<render_attachment id="a1" version="1" />')).toBe('Here:');
  });
});
