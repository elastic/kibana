/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { useEffect, useMemo } from 'react';
import { monaco } from '@kbn/monaco';
import type { StepDecoration } from '../types';
import { getStepDecorationsStyles } from '../styles';

export const useStepDecorations = (
  editor: monaco.editor.IStandaloneCodeEditor | null,
  decorations: StepDecoration[]
) => {
  const decorationsCollection = useMemo(() => {
    if (!editor) {
      return null;
    }
    return editor.createDecorationsCollection();
  }, [editor]);

  useEffect(() => {
    decorationsCollection?.clear();

    if (!decorations || decorations.length === 0) {
      return;
    }

    const monacoDecorations = decorations.map((decoration) => {
      return {
        range: new monaco.Range(decoration.lineStart, 1, decoration.lineEnd, 1),
        options: {
          className: `streamlang-step-execution-${decoration.status}`,
          isWholeLine: true,
        },
      };
    });

    decorationsCollection?.set(monacoDecorations);
  }, [decorations, decorationsCollection]);

  const { euiTheme } = useEuiTheme();
  const styles = useMemo(() => getStepDecorationsStyles(euiTheme), [euiTheme]);

  return { styles };
};
