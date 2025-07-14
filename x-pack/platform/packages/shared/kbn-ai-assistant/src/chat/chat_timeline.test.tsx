/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { highlightContent } from './chat_timeline';

describe('highlightContent', () => {
  const entityValue = 'John Doe';
  const entityObj = { class_name: 'PER', value: entityValue, mask: 'PERSON_1' };

  it('highlights anonymized entities', () => {
    const content = `Hi, my name is ${entityValue}.`;
    const startPos = content.indexOf(entityValue);
    const endPos = startPos + entityValue.length;

    const result = highlightContent(content, [{ start: startPos, end: endPos, entity: entityObj }]);

    expect(result).toBe(
      `Hi, my name is !{anonymized{"entityClass":"PER","content":"${entityValue}"}}.`
    );
  });

  it('does not highlight entities that are inside inlined code', () => {
    const content = `Here is my full name, inlined in code \`${entityValue}\`.`;
    const startPos = content.indexOf(entityValue);
    const endPos = startPos + entityValue.length;

    const result = highlightContent(content, [{ start: startPos, end: endPos, entity: entityObj }]);

    // The content should remain unchanged because the entity is inside inline code.
    expect(result).toBe(content);
  });

  it('does not highlight entities that are inside fenced code blocks', () => {
    const content = `Here is code block:
        \`\`\`
        ${entityValue}
        \`\`\`
        End.`;
    const startPos = content.indexOf(entityValue);
    const endPos = startPos + entityValue.length;

    const result = highlightContent(content, [{ start: startPos, end: endPos, entity: entityObj }]);

    // The content should remain unchanged because the entity is inside a fenced code block.
    expect(result).toBe(content);
  });
});
