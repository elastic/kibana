/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef, useMemo, useEffect } from 'react';
import { useController, useFormContext } from 'react-hook-form';
import { EuiFormRow, EuiLink, EuiSpacer, useEuiTheme } from '@elastic/eui';
import type { CodeEditorProps, monaco } from '@kbn/code-editor';
import { CodeEditor } from '@kbn/code-editor';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { dynamic } from '@kbn/shared-ux-utility';
import { colourToClassName, getColourPaletteStyles } from '@kbn/grok-ui';
import { useKibana } from '../../../../../../../../hooks/use_kibana';
import { useAIFeatures } from '../../../../../../../../hooks/use_ai_features';
import type { ProcessorFormState } from '../../../../types';
import { DissectColorManager } from './dissect_color_manager';

const DissectPatternAISuggestions = dynamic(() =>
  import('./dissect_pattern_suggestion').then((mod) => ({
    default: mod.DissectPatternAISuggestions,
  }))
);

export const DissectPatternDefinition = () => {
  const { core } = useKibana();
  const esDocUrl = core.docLinks.links.ingest.dissectKeyModifiers;
  const aiFeatures = useAIFeatures();
  const { setValue } = useFormContext();
  const { euiTheme } = useEuiTheme();

  const colorManager = useMemo(() => new DissectColorManager(), []);

  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const decorationsRef = useRef<monaco.editor.IEditorDecorationsCollection | null>(null);

  const colourPaletteStyles = useMemo(() => getColourPaletteStyles(euiTheme), [euiTheme]);

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

  const onEditorDidMount: CodeEditorProps['editorDidMount'] = (editor) => {
    editorRef.current = editor;
    decorationsRef.current = editor.createDecorationsCollection();
    colorManager.updatePattern(serialize(field.value));
    updateDecorations(colorManager, editorRef, decorationsRef);
  };

  const onEditorChange: CodeEditorProps['onChange'] = (value) => {
    field.onChange(deserialize(value));
    colorManager.updatePattern(value);
    updateDecorations(colorManager, editorRef, decorationsRef);
  };

  useEffect(() => {
    const serialized = serialize(field.value);
    colorManager.updatePattern(serialized);
    updateDecorations(colorManager, editorRef, decorationsRef);
  }, [field.value, colorManager]);

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
            onChange={onEditorChange}
            languageId="text"
            height={75}
            editorDidMount={onEditorDidMount}
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

const updateDecorations = (
  manager: DissectColorManager,
  editorRefLocal: React.RefObject<monaco.editor.IStandaloneCodeEditor | null>,
  decorationsRefLocal: React.RefObject<monaco.editor.IEditorDecorationsCollection | null>
) => {
  const editor = editorRefLocal.current;
  const decorationsCollection = decorationsRefLocal.current;
  if (!editor || !decorationsCollection) return;

  const model = editor.getModel();
  if (!model) return;

  const text = model.getValue();
  const tokens = manager.getTokens(text);
  const fieldColourMap = manager.getFieldColourMap();

  const decorations: monaco.editor.IModelDeltaDecoration[] = tokens.map((token) => {
    const colour = fieldColourMap.get(token.fieldName);
    const startPos = model.getPositionAt(token.startIndex);
    const endPos = model.getPositionAt(token.endIndex);
    return {
      range: {
        startLineNumber: startPos.lineNumber,
        startColumn: startPos.column,
        endLineNumber: endPos.lineNumber,
        endColumn: endPos.column,
      },
      options: {
        inlineClassName: colour ? colourToClassName(colour) : undefined,
      },
    };
  });

  decorationsCollection.clear();
  decorationsCollection.set(decorations);
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
