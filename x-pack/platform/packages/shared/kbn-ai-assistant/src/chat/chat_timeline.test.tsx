/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { highlightContent } from './chat_timeline';

describe('highlightContent', () => {
  const entity = 'user@elastic.co';

  it('highlights anonymized entities', () => {
    const content = `Contact me at ${entity} for details.`;
    const startPos = content.indexOf(entity);
    const endPos = startPos + entity.length;

    const result = highlightContent(content, [
      { start_pos: startPos, end_pos: endPos, entity: 'EMAIL' },
    ]);

    expect(result).toBe(`Contact me at !{anonymizedContent(${entity})} for details.`);
  });

  it('does not highlight entities that are inside inline code', () => {
    const content = `Here is email in code \`${entity}\` and text.`;
    const startPos = content.indexOf(entity);
    const endPos = startPos + entity.length;

    const result = highlightContent(content, [
      { start_pos: startPos, end_pos: endPos, entity: 'EMAIL' },
    ]);

    // The content should remain unchanged because the entity is inside inline code.
    expect(result).toBe(content);
  });

  it('does not highlight entities that are inside fenced code blocks', () => {
    const content = `Here is code block:
        \`\`\`
        ${entity}
        \`\`\`
        End.`;
    const startPos = content.indexOf(entity);
    const endPos = startPos + entity.length;

    const result = highlightContent(content, [
      { start_pos: startPos, end_pos: endPos, entity: 'EMAIL' },
    ]);

    // The content should remain unchanged because the entity is inside a fenced code block.
    expect(result).toBe(content);
  });
});
