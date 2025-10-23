/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useEuiTheme, EuiText } from '@elastic/eui';
import type { FindFileStructureResponse } from '@kbn/file-upload-common';
import { useDataVisualizerKibana } from '../../../../kibana_context';
import { FieldBadge } from './field_badge';
import { GrokHighlighter } from './grok_highlighter';

export function useGrokHighlighter() {
  const {
    services: { http },
  } = useDataVisualizerKibana();
  const { euiTheme } = useEuiTheme();

  const createLines = useMemo(
    () =>
      async (
        text: string,
        grokPattern: string,
        mappings: FindFileStructureResponse['mappings'],
        ecsCompatibility: string | undefined,
        multilineStartPattern: string,
        excludeLinesPattern: string | undefined
      ) => {
        const grokHighlighter = new GrokHighlighter(
          { multilineStartPattern, excludeLinesPattern },
          http
        );
        const lines = await grokHighlighter.createLines(
          text,
          grokPattern,
          mappings,
          ecsCompatibility
        );

        return lines.map((line) => {
          const formattedWords: JSX.Element[] = [];
          for (let j = 0; j < line.length; j++) {
            const { word, field } = line[j];
            const key = `word-${j}`;
            if (field) {
              formattedWords.push(
                <FieldBadge type={field.type} value={word} name={field.name} key={key} />
              );
            } else {
              formattedWords.push(<span key={key}>{word}</span>);
            }
          }
          return (
            <EuiText
              size="s"
              css={{ lineHeight: euiTheme.size.l }}
              data-test-subj="dataVisualizerHighlightedLine"
            >
              <code>{formattedWords}</code>
            </EuiText>
          );
        });
      },
    [euiTheme, http]
  );

  return createLines;
}
