/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiBasicTable, EuiCodeBlock } from '@elastic/eui';
import type { CategoryFieldExample } from '@kbn/ml-category-validator';

interface Props {
  fieldExamples: CategoryFieldExample[] | null;
}

const TOKEN_HIGHLIGHT_COLOR = '#b0ccf7';

export const FieldExamples: FC<Props> = ({ fieldExamples }) => {
  if (fieldExamples === null || fieldExamples.length === 0) {
    return null;
  }

  const columns = [
    {
      field: 'example',
      name: i18n.translate(
        'xpack.ml.newJob.wizard.pickFieldsStep.categorizationFieldExamples.title',
        {
          defaultMessage: 'Examples',
        }
      ),
      render: (example: any) => (
        <EuiCodeBlock
          fontSize="s"
          paddingSize="none"
          transparentBackground
          style={{ maxHeight: '200px' }} // Don't use overflowHeight as don't want to show the fullscreen button
        >
          {example}
        </EuiCodeBlock>
      ),
    },
  ];
  const items = fieldExamples.map((example, i) => {
    const txt = [];
    let tokenCounter = 0;
    let buffer = '';
    let charCount = 0;
    while (charCount < example.text.length) {
      const token = example.tokens[tokenCounter];
      if (token && charCount === token.start_offset) {
        txt.push(buffer);
        buffer = '';
        txt.push(<Token key={`${i}${charCount}`}>{token.token}</Token>);
        charCount += token.end_offset - token.start_offset;
        tokenCounter++;
      } else {
        buffer += example.text[charCount];
        charCount++;
      }
    }
    txt.push(buffer);
    return { example: txt };
  });
  return (
    <EuiBasicTable
      columns={columns}
      items={items}
      data-test-subj="mlJobWizardCategorizationExamplesTable"
    />
  );
};

const Token: FC<PropsWithChildren<unknown>> = ({ children }) => (
  <span style={{ backgroundColor: TOKEN_HIGHLIGHT_COLOR }}>{children}</span>
);
