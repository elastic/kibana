/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { EuiBasicTable, EuiText } from '@elastic/eui';

interface Props {
  fieldExamples: Cat[] | null;
}

interface Token {
  token: string;
  start_offset: number;
  end_offset: number;
  type: string;
  position: number;
}

interface Cat {
  text: string;
  tokens: Token[];
}

const TOKEN_HIGHLIGHT_COLOR = '#b0ccf7';

export const FieldExamples: FC<Props> = ({ fieldExamples }) => {
  if (fieldExamples === null || fieldExamples.length === 0) {
    return null;
  }

  const columns = [
    {
      field: 'example',
      name: 'Examples',
      render: (example: any) => (
        <EuiText size="s">
          <code>{example}</code>
        </EuiText>
      ),
    },
  ];
  const items = fieldExamples.map((example, e) => {
    const txt = [];
    let tokenCounter = 0;
    let buffer = '';
    let i = 0;
    while (i < example.text.length) {
      const token = example.tokens[tokenCounter];
      if (token && i === token.start_offset) {
        txt.push(buffer);
        buffer = '';
        txt.push(<Token key={`${e}${i}`}>{token.token}</Token>);
        i += token.end_offset - token.start_offset;
        tokenCounter++;
      } else {
        buffer += example.text[i];
        i++;
      }
    }
    txt.push(buffer);
    return { example: txt };
  });
  return <EuiBasicTable columns={columns} items={items} />;
};

const Token: FC = ({ children }) => (
  <span style={{ backgroundColor: TOKEN_HIGHLIGHT_COLOR }}>{children}</span>
);
