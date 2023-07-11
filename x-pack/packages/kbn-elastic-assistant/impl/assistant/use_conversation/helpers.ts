/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

export interface CodeBlockDetails {
  type: QueryType;
  content: string;
  start: number;
  end: number;
  getControlContainer?: () => Element | undefined;
  button?: React.ReactNode;
}

export type QueryType = 'eql' | 'kql' | 'dsl' | 'json' | 'no-type';

/**
 * `analyzeMarkdown` is a helper that enriches content returned from a query
 * with action buttons
 *
 * Returns a list of code block details for each code block in the markdown,
 * including the type of code block and the content of the code block.
 *
 * @param markdown
 */
export const analyzeMarkdown = (markdown: string): CodeBlockDetails[] => {
  const codeBlockRegex = /```(\w+)?\s([\s\S]*?)```/g;
  const matches = [...markdown.matchAll(codeBlockRegex)];
  // If your codeblocks aren't getting tagged with the right language, add keywords to the array.
  const types = {
    eql: ['Event Query Language', 'EQL sequence query', 'EQL'],
    kql: ['Kibana Query Language', 'KQL Query', 'KQL'],
    dsl: [
      'Elasticsearch QueryDSL',
      'Elasticsearch Query DSL',
      'Elasticsearch DSL',
      'Query DSL',
      'DSL',
    ],
  };

  const result: CodeBlockDetails[] = matches.map((match) => {
    let type = match[1] || 'no-type';
    if (type === 'no-type' || type === 'json') {
      const start = match.index || 0;
      const precedingText = markdown.slice(0, start);
      for (const [typeKey, keywords] of Object.entries(types)) {
        if (keywords.some((kw) => precedingText.toLowerCase().includes(kw.toLowerCase()))) {
          type = typeKey;
          break;
        }
      }
    }

    const content = match[2].trim();
    const start = match.index || 0;
    const end = start + match[0].length;
    return { type: type as QueryType, content, start, end };
  });

  return result;
};
