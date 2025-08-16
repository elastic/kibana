/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { VisualizeESQL } from './visualize_esql';

type ToolRunsById = Record<
  string,
  {
    esqlQuery: string;
    esqlData: {
      columns: { name: string; type: string }[];
      values: (string | number | boolean | null)[][];
    };
  }
>;

export function LLMMarkdown({
  markdown,
  toolRunsById,
}: {
  markdown: string;
  toolRunsById: ToolRunsById;
}) {
  return (
    <ReactMarkdown
      components={{
        code({ inline, className, children }) {
          const lang = /language-(\w+)/.exec(className || '')?.[1];
          if (!inline && lang === 'tool_result') {
            const { toolCallId } = JSON.parse(String(children));
            const { esqlQuery, esqlData } = toolRunsById[toolCallId];
            console.log(esqlQuery, esqlData);
            return <VisualizeESQL esqlQuery={esqlQuery} esqlData={esqlData} />;
          }
          return <code className={className}>{children}</code>;
        },
      }}
    >
      {markdown}
    </ReactMarkdown>
  );
}
