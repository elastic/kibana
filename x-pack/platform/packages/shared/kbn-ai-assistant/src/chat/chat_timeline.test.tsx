/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { highlightContent } from './chat_timeline';

describe('highlightContent', () => {
  const entity = 'John Doe';

  it('highlights anonymized entities', () => {
    const content = `Hi, my name is ${entity}.`;
    const startPos = content.indexOf(entity);
    const endPos = startPos + entity.length;

    const result = highlightContent(content, [
      { start_pos: startPos, end_pos: endPos, entity, class_name: 'PER' },
    ]);

    expect(result).toBe(`Hi, my name is !{anonymized{"entityClass":"PER","content":"${entity}"}}.`);
  });

  it('does not highlight entities that are inside inlined code', () => {
    const content = `Here is my full name, inlined in code \`${entity}\`.`;
    const startPos = content.indexOf(entity);
    const endPos = startPos + entity.length;

    const result = highlightContent(content, [
      { start_pos: startPos, end_pos: endPos, entity, class_name: 'PER' },
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
      { start_pos: startPos, end_pos: endPos, entity, class_name: 'PER' },
    ]);

    // The content should remain unchanged because the entity is inside a fenced code block.
    expect(result).toBe(content);
  });
});
