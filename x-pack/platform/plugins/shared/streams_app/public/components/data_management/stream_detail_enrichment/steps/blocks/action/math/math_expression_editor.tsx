/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiButtonEmpty,
  EuiToolTip,
  EuiText,
  EuiFormRow,
  EuiPopover,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { CodeEditor } from '@kbn/code-editor';
import { i18n } from '@kbn/i18n';
import { useController } from 'react-hook-form';
import { LanguageDocumentationPopover } from '@kbn/language-documentation';
import { Markdown } from '@kbn/shared-ux-markdown';
import { monaco } from '@kbn/monaco';
import { validateMathExpression, getMathExpressionLanguageDocSections } from '@kbn/streamlang';
import type { ProcessorFormState } from '../../../../types';
import { useEnrichmentFieldSuggestions } from '../../../../../../../hooks/use_field_suggestions';
// Import to register the math language with Monaco
import { STREAMS_MATH_LANGUAGE_ID } from './math_expression_tokenization';
import {
  registerMathCompletionProvider,
  registerMathSignatureHelpProvider,
} from './math_expression_completion';

export const MathExpressionEditor: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const [isWordWrapped, setIsWordWrapped] = useState(true);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const modelRef = useRef<monaco.editor.ITextModel | null>(null);

  // Get field suggestions for autocompletion
  const fieldSuggestions = useEnrichmentFieldSuggestions();

  const { field } = useController<ProcessorFormState, 'expression'>({
    name: 'expression',
    rules: {
      required: i18n.translate('xpack.streams.math.editorExpressionRequired', {
        defaultMessage: 'An expression is required.',
      }),
      validate: (value: string) => {
        if (!value.trim()) return true;
        const result = validateMathExpression(value);
        if (!result.valid) {
          return result.errors.join('; ');
        }
        return true;
      },
    },
  });

  // Real-time validation for inline display (separate from form validation)
  const validationResult = useMemo(() => {
    if (!field.value || !field.value.trim()) return null;
    return validateMathExpression(field.value);
  }, [field.value]);

  const hasInlineError = validationResult && !validationResult.valid;

  // Set error markers on the Monaco model for squiggly underlines
  useEffect(() => {
    const model = modelRef.current;
    if (!model) return;

    if (hasInlineError && validationResult) {
      // Create markers for each error
      // Since we don't have precise position info, mark the entire content
      const markers: monaco.editor.IMarkerData[] = validationResult.errors.map((error) => ({
        severity: monaco.MarkerSeverity.Error,
        message: error,
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: model.getLineCount(),
        endColumn: model.getLineMaxColumn(model.getLineCount()),
      }));
      monaco.editor.setModelMarkers(model, 'math-validation', markers);
    } else {
      // Clear markers when valid
      monaco.editor.setModelMarkers(model, 'math-validation', []);
    }
  }, [hasInlineError, validationResult]);

  // Register completion provider with field suggestions (re-register when suggestions change)
  useEffect(() => {
    const completionDisposable = registerMathCompletionProvider(fieldSuggestions);
    return () => {
      completionDisposable.dispose();
    };
  }, [fieldSuggestions]);

  // Register signature help provider (static, only needs to be registered once)
  useEffect(() => {
    const signatureDisposable = registerMathSignatureHelpProvider();
    return () => {
      signatureDisposable.dispose();
    };
  }, []);

  const handleWordWrapToggle = useCallback(() => {
    const newValue = !isWordWrapped;
    editorRef.current?.updateOptions?.({ wordWrap: newValue ? 'on' : 'off' });
    setIsWordWrapped(newValue);
  }, [isWordWrapped]);

  // Format documentation sections for LanguageDocumentationPopover
  const documentationSections = useMemo(() => {
    const { groups, initialSection } = getMathExpressionLanguageDocSections();
    return {
      groups,
      initialSection: <Markdown readOnly>{initialSection}</Markdown>,
    };
  }, []);

  const containerStyles = css`
    border: ${euiTheme.border.thin};
    border-radius: ${euiTheme.border.radius.medium};
    overflow: hidden;
  `;

  const headerStyles = css`
    background-color: ${euiTheme.colors.backgroundBaseSubdued};
    padding: ${euiTheme.size.xs} ${euiTheme.size.s};
    border-bottom: ${euiTheme.border.thin};
  `;

  const footerStyles = css`
    background-color: ${euiTheme.colors.backgroundBaseSubdued};
    padding: ${euiTheme.size.xs} ${euiTheme.size.s};
    border-top: ${euiTheme.border.thin};
  `;

  // Collect errors for display
  const errors = hasInlineError ? validationResult.errors : [];

  return (
    <EuiFormRow
      label={i18n.translate('xpack.streams.math.editorLabel', {
        defaultMessage: 'Expression',
      })}
      isInvalid={errors.length > 0}
      fullWidth
    >
      <div css={containerStyles} data-test-subj="streamsMathExpressionEditor">
        {/* Header with word wrap toggle */}
        <div css={headerStyles}>
          <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiToolTip
                content={
                  isWordWrapped
                    ? i18n.translate('xpack.streams.math.editorDisableWordWrap', {
                        defaultMessage: 'Disable word wrap',
                      })
                    : i18n.translate('xpack.streams.math.editorEnableWordWrap', {
                        defaultMessage: 'Enable word wrap',
                      })
                }
                disableScreenReaderOutput
              >
                <EuiButtonIcon
                  iconType={isWordWrapped ? 'wordWrap' : 'wordWrapDisabled'}
                  display={!isWordWrapped ? 'fill' : undefined}
                  color="text"
                  aria-label={
                    isWordWrapped
                      ? i18n.translate('xpack.streams.math.editorDisableWordWrap', {
                          defaultMessage: 'Disable word wrap',
                        })
                      : i18n.translate('xpack.streams.math.editorEnableWordWrap', {
                          defaultMessage: 'Enable word wrap',
                        })
                  }
                  onClick={handleWordWrapToggle}
                  data-test-subj="streamsMathExpressionEditor-wordWrap"
                />
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>

        {/* Code Editor */}
        <CodeEditor
          languageId={STREAMS_MATH_LANGUAGE_ID}
          value={field.value ?? ''}
          onChange={field.onChange}
          height="100px"
          options={{
            automaticLayout: true,
            minimap: { enabled: false },
            lineNumbers: 'off',
            folding: false,
            wordWrap: isWordWrapped ? 'on' : 'off',
            scrollBeyondLastLine: false,
            renderLineHighlight: 'none',
            overviewRulerLanes: 0,
            overviewRulerBorder: false,
          }}
          editorDidMount={(editor) => {
            editorRef.current = editor;
            modelRef.current = editor.getModel();
          }}
          placeholder={i18n.translate('xpack.streams.math.editorPlaceholder', {
            defaultMessage:
              'For example: \nattributes.duration_ms / 1000 \nor \nresource.a.size > resource.b.size',
          })}
          data-test-subj="streamsMathExpressionEditor-input"
        />

        {/* Footer with docs button (left) and error display (right) */}
        <div css={footerStyles}>
          <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
            <EuiFlexItem grow={false}>
              <LanguageDocumentationPopover
                language={i18n.translate('xpack.streams.math.expressionsLanguage', {
                  defaultMessage: 'Expressions',
                })}
                sections={documentationSections}
                buttonProps={{
                  color: 'text',
                  'data-test-subj': 'streamsMathExpressionEditor-documentation',
                  'aria-label': i18n.translate('xpack.streams.math.expressionsReferenceAriaLabel', {
                    defaultMessage: 'Expressions reference',
                  }),
                }}
                isHelpMenuOpen={isHelpOpen}
                onHelpMenuVisibilityChange={setIsHelpOpen}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <ErrorPopover errors={errors} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </div>
    </EuiFormRow>
  );
};

interface ErrorPopoverProps {
  errors: string[];
}

const ErrorPopover: React.FC<ErrorPopoverProps> = ({ errors }) => {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(false);

  if (errors.length === 0) return null;

  return (
    <EuiPopover
      ownFocus={false}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      button={
        <EuiButtonEmpty
          color="danger"
          iconType="warning"
          size="xs"
          flush="right"
          onClick={() => setIsOpen(!isOpen)}
          data-test-subj="streamsMathExpressionEditor-errorButton"
        >
          {i18n.translate('xpack.streams.math.errorCount', {
            defaultMessage: '{count} {count, plural, one {error} other {errors}}',
            values: { count: errors.length },
          })}
        </EuiButtonEmpty>
      }
    >
      <div
        css={css`
          max-width: ${euiTheme.base * 20}px;
        `}
      >
        {errors.map((error, index) => (
          <EuiText key={index} size="s" color="danger">
            {error}
          </EuiText>
        ))}
      </div>
    </EuiPopover>
  );
};
