/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  attachmentToolsInstructions,
  attachmentTypeInstructions,
  renderAttachmentPrompt,
} from './attachments';

describe('attachmentToolsInstructions', () => {
  it('is static: contains no attachment ids, types, or counts', () => {
    const text = attachmentToolsInstructions();

    expect(text).toContain('MUST use the attachment tools');
    expect(text).toContain('attachment_read');
    expect(text).toContain('attachment_list');
    expect(text).toContain('attachment_diff');
    // No conversation-specific data.
    expect(text).not.toMatch(/attachment_id="/);
    expect(text).not.toMatch(/\d+ attachment\(s\)/);
  });

  it('produces byte-identical output across calls (no hidden per-call state)', () => {
    expect(attachmentToolsInstructions()).toBe(attachmentToolsInstructions());
  });
});

describe('attachmentTypeInstructions', () => {
  it('returns an empty string for no types', () => {
    expect(attachmentTypeInstructions([])).toBe('');
  });

  it('renders a per-type section with its description', () => {
    const text = attachmentTypeInstructions([{ type: 'esql', description: 'An ES|QL query.' }]);

    expect(text).toContain('## ATTACHMENT TYPES');
    expect(text).toContain('### esql attachments');
    expect(text).toContain('An ES|QL query.');
  });

  it('renders one section per type, in the given order', () => {
    const text = attachmentTypeInstructions([
      { type: 'text', description: 'Plain text.' },
      { type: 'esql', description: 'An ES|QL query.' },
    ]);

    expect(text.indexOf('### text attachments')).toBeGreaterThanOrEqual(0);
    expect(text.indexOf('### esql attachments')).toBeGreaterThan(
      text.indexOf('### text attachments')
    );
  });

  it('falls back to a default note when a type has no description', () => {
    const text = attachmentTypeInstructions([{ type: 'text' }]);
    expect(text).toContain('No instructions available.');
  });
});

describe('renderAttachmentPrompt', () => {
  it('no longer references the removed "ATTACHMENT TYPES section" wording', () => {
    const text = renderAttachmentPrompt();
    expect(text).not.toContain('"ATTACHMENT TYPES" section');
  });

  it('still documents the inline render element', () => {
    const text = renderAttachmentPrompt();
    expect(text).toContain('INLINE ATTACHMENT RENDERING');
    expect(text).toContain('attachment_id');
  });
});
