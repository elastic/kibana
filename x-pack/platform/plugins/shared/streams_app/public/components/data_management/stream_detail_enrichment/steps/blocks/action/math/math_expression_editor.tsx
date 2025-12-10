/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiToolTip,
  EuiText,
  EuiFormRow,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { CodeEditor } from '@kbn/code-editor';
import { i18n } from '@kbn/i18n';
import { useController } from 'react-hook-form';
import { LanguageDocumentationPopover } from '@kbn/language-documentation';
import { Markdown } from '@kbn/shared-ux-markdown';
import { validateMathExpression, getMathExpressionLanguageDocSections } from '@kbn/streamlang';
import type { ProcessorFormState } from '../../../../types';

export const MathExpressionEditor: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const [isWordWrapped, setIsWordWrapped] = useState(true);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const editorRef = useRef<{ updateOptions: (opts: Record<string, unknown>) => void } | null>(null);

  const { field, fieldState } = useController<ProcessorFormState, 'expression'>({
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

  const handleWordWrapToggle = useCallback(() => {
    const newValue = !isWordWrapped;
    editorRef.current?.updateOptions({ wordWrap: newValue ? 'on' : 'off' });
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

  return (
    <EuiFormRow
      label={i18n.translate('xpack.streams.math.editorLabel', {
        defaultMessage: 'Expression',
      })}
      isInvalid={fieldState.invalid}
      error={fieldState.error?.message}
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
          languageId="text"
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
          }}
          editorDidMount={(editor) => {
            editorRef.current = editor;
          }}
          placeholder={i18n.translate('xpack.streams.math.editorPlaceholder', {
            defaultMessage:
              'e.g. \nfloor(attributes.duration_ms / 1000) \nor \nresource.a.size > resource.b.size',
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
            <EuiFlexItem grow />
            {hasInlineError && (
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="danger">
                  {validationResult.errors[0]}
                </EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </div>
      </div>
    </EuiFormRow>
  );
};
