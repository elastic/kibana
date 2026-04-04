/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef, useMemo, useCallback, useEffect } from 'react';
import { useController, useFormContext } from 'react-hook-form';
import { EuiFormRow, EuiLink, EuiSpacer, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { CodeEditorProps, monaco } from '@kbn/code-editor';
import { CodeEditor } from '@kbn/code-editor';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { dynamic } from '@kbn/shared-ux-utility';
import { useKibana } from '../../../../../../../../hooks/use_kibana';
import { useAIFeatures } from '../../../../../../../../hooks/use_ai_features';
import type { ProcessorFormState } from '../../../../types';
import {
  parseDissectTokens,
  getDissectColourPaletteStyles,
  colourToClassName,
} from '../../../../dissect_highlighting';

const DissectPatternAISuggestions = dynamic(() =>
  import('./dissect_pattern_suggestion').then((mod) => ({
    default: mod.DissectPatternAISuggestions,
  }))
);

// Regex to match %{...} tokens in a dissect pattern with their positions
const DISSECT_FIELD_PATTERN_REGEX = /%\{([^}]*)}/g;

export const DissectPatternDefinition = () => {
  const { core } = useKibana();
  const esDocUrl = core.docLinks.links.ingest.dissectKeyModifiers;
  const aiFeatures = useAIFeatures();
  const { setValue } = useFormContext();
  const eui = useEuiTheme();

  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const decorationsRef = useRef<monaco.editor.IEditorDecorationsCollection | null>(null);

  const colourPaletteStyles = useMemo(
    () => getDissectColourPaletteStyles(eui.euiTheme),
    [eui.euiTheme]
  );

  const { field, fieldState } = useController<ProcessorFormState, 'pattern'>({
    name: 'pattern',
    rules: {
      required: i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.dissectPatternRequiredError',
        { defaultMessage: 'A pattern is required.' }
      ),
    },
  });

  const { invalid, error } = fieldState;

  const updateDecorations = useCallback(
    (text: string) => {
      if (!editorRef.current || !decorationsRef.current) return;

      const model = editorRef.current.getModel();
      if (!model) return;

      // Parse tokens to get field -> colour mapping
      const tokens = parseDissectTokens(text);
      const fieldColourMap = new Map<string, string>();
      for (const token of tokens) {
        if (token.type === 'field' && token.name && !fieldColourMap.has(token.name)) {
          fieldColourMap.set(token.name, token.color);
        }
      }

      const decorations: Array<{
        range: {
          startLineNumber: number;
          startColumn: number;
          endLineNumber: number;
          endColumn: number;
        };
        options: { inlineClassName: string };
      }> = [];

      // Find all %{...} patterns and apply colour decorations
      let match;
      DISSECT_FIELD_PATTERN_REGEX.lastIndex = 0;
      while ((match = DISSECT_FIELD_PATTERN_REGEX.exec(text)) !== null) {
        let keyDefinition = match[1];
        if (!keyDefinition) continue;

        // Strip modifiers to get the field name (same logic as parseDissectTokens)
        const firstChar = keyDefinition[0];
        const isSkip = firstChar === '?' || firstChar === '*' || firstChar === '&';
        if (
          firstChar === '?' ||
          firstChar === '+' ||
          firstChar === '*' ||
          firstChar === '&'
        ) {
          keyDefinition = keyDefinition.slice(1);
        }
        if (keyDefinition.endsWith('->')) {
          keyDefinition = keyDefinition.slice(0, -2);
        }
        const orderMatch = keyDefinition.match(/^(.+)\/(\d+)$/);
        if (orderMatch) {
          keyDefinition = orderMatch[1];
        }
        keyDefinition = keyDefinition.trim();
        if (!keyDefinition) continue;

        // Determine colour: skip fields get Subdued, others get their assigned colour
        const colour = isSkip ? 'Subdued' : fieldColourMap.get(keyDefinition);
        if (!colour) continue;

        const startPos = model.getPositionAt(match.index);
        const endPos = model.getPositionAt(match.index + match[0].length);
        decorations.push({
          range: {
            startLineNumber: startPos.lineNumber,
            startColumn: startPos.column,
            endLineNumber: endPos.lineNumber,
            endColumn: endPos.column,
          },
          options: {
            inlineClassName: colourToClassName(colour),
          },
        });
      }

      decorationsRef.current.clear();
      decorationsRef.current.set(decorations);
    },
    []
  );

  const onEditorMount: CodeEditorProps['editorDidMount'] = useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor) => {
      editorRef.current = editor;
      decorationsRef.current = editor.createDecorationsCollection();
      updateDecorations(serialize(field.value));
    },
    [field.value, updateDecorations]
  );

  // Re-apply decorations when pattern changes externally (e.g. from form state)
  useEffect(() => {
    updateDecorations(serialize(field.value));
  }, [field.value, updateDecorations]);

  return (
    <>
      <EuiFormRow
        label={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processor.dissectPatternDefinitionsLabel',
          { defaultMessage: 'Pattern' }
        )}
        helpText={
          <FormattedMessage
            id="xpack.streams.streamDetailView.managementTab.enrichment.processor.dissectPatternDefinitionsHelpText"
            defaultMessage="The pattern is defined by the parts of the string to discard. Use a {keyModifier} to alter the dissection behavior."
            values={{
              keyModifier: (
                <EuiLink
                  data-test-subj="streamsAppDissectPatternDefinitionKeyModifierLink"
                  target="_blank"
                  external
                  href={esDocUrl}
                >
                  {i18n.translate(
                    'xpack.streams.streamDetailView.managementTab.enrichment.processor.dissectPatternDefinitionsLink',
                    { defaultMessage: 'key modifier' }
                  )}
                </EuiLink>
              ),
            }}
          />
        }
        isInvalid={invalid}
        error={error?.message}
        fullWidth
      >
        <div
          css={css`
            ${colourPaletteStyles}
          `}
        >
          <CodeEditor
            value={serialize(field.value)}
            onChange={(value) => {
              field.onChange(deserialize(value));
              updateDecorations(value);
            }}
            languageId="text"
            height={75}
            editorDidMount={onEditorMount}
            options={{
              automaticLayout: true,
              minimap: { enabled: false },
            }}
            aria-label={i18n.translate(
              'xpack.streams.streamDetailView.managementTab.enrichment.processor.dissectPatternDefinitionsAriaLabel',
              { defaultMessage: 'Pattern editor' }
            )}
          />
        </div>
      </EuiFormRow>
      {aiFeatures && (
        <>
          <EuiSpacer size="s" />
          <DissectPatternAISuggestions aiFeatures={aiFeatures} setValue={setValue} />
        </>
      )}
    </>
  );
};

const serialize = (input: string) => {
  if (typeof input === 'string') {
    const s = JSON.stringify(input);
    return s.slice(1, s.length - 1);
  }

  return input;
};

const deserialize = (input: string) => {
  if (typeof input === 'string') {
    try {
      return JSON.parse(`"${input}"`);
    } catch (e) {
      return input;
    }
  }
};
