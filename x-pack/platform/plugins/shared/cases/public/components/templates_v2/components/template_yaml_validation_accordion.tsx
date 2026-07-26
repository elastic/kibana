/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseEuiTheme } from '@elastic/eui';
import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  euiFontSize,
  EuiIcon,
  EuiLoadingSpinner,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useMemo } from 'react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { FormattedMessage } from '@kbn/i18n-react';
import * as i18n from '../translations';

export interface ValidationError {
  message: string;
  severity: 'error' | 'warning';
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
}

interface TemplateYamlValidationAccordionProps {
  isMounted: boolean;
  validationErrors: ValidationError[] | null;
  onErrorClick?: (error: ValidationError) => void;
}

export const TemplateYamlValidationAccordion: React.FC<TemplateYamlValidationAccordionProps> = ({
  isMounted,
  validationErrors,
  onErrorClick,
}) => {
  const styles = useMemoCss(componentStyles);
  const { euiTheme } = useEuiTheme();
  const accordionId = useGeneratedHtmlId({ prefix: 'template-yaml-validation-errors' });

  let icon: React.ReactNode | null = null;
  let buttonContent: React.ReactNode | null = null;

  const sortedValidationErrors = useMemo(() => {
    if (!validationErrors) return [];
    return [...validationErrors].sort((a, b) => {
      if (a.startLineNumber === b.startLineNumber) {
        if (a.startColumn === b.startColumn) {
          const severityOrder = ['error', 'warning'];
          return severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity);
        }
        return a.startColumn - b.startColumn;
      }
      return a.startLineNumber - b.startLineNumber;
    });
  }, [validationErrors]);

  if (!isMounted) {
    icon = <EuiLoadingSpinner size="m" />;
    buttonContent = i18n.VALIDATION_LOADING_EDITOR;
  } else if (!validationErrors || validationErrors.length === 0) {
    icon = (
      <EuiIcon
        type="checkInCircleFilled"
        color={euiTheme.colors.vis.euiColorVisSuccess0}
        size="m"
        aria-hidden={true}
      />
    );
    buttonContent = i18n.VALIDATION_NO_ERRORS;
  } else {
    const hasErrors = validationErrors.some((error) => error.severity === 'error');
    const errorCount = validationErrors.filter((error) => error.severity === 'error').length;
    const warningCount = validationErrors.filter((error) => error.severity === 'warning').length;

    icon = (
      <EuiIcon
        type={hasErrors ? 'errorFilled' : 'warningFilled'}
        color={hasErrors ? 'danger' : euiTheme.colors.vis.euiColorVis8}
        size="m"
        aria-hidden={true}
      />
    );

    const parts = [];
    if (errorCount > 0) {
      parts.push(
        <FormattedMessage
          id="xpack.cases.templates.validation.errorCount"
          defaultMessage="{errorCount} error{errorCount, plural, one {} other {s}}"
          values={{ errorCount }}
        />
      );
    }
    if (warningCount > 0) {
      parts.push(
        <FormattedMessage
          id="xpack.cases.templates.validation.warningCount"
          defaultMessage="{warningCount} warning{warningCount, plural, one {} other {s}}"
          values={{ warningCount }}
        />
      );
    }
    buttonContent = parts.reduce((acc, part, idx) => (
      <>
        {acc}
        {idx > 0 ? ', ' : ''}
        {part}
      </>
    ));
  }

  return (
    <EuiAccordion
      id={accordionId}
      data-test-subj="templateYamlValidationErrorsList"
      buttonContent={
        <EuiFlexGroup alignItems="center" gutterSize="s" css={styles.buttonContent}>
          <EuiFlexItem grow={false}>{icon}</EuiFlexItem>
          <EuiFlexItem css={styles.buttonContentText} className="button-content-text">
            {buttonContent}
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      arrowDisplay={validationErrors !== null && validationErrors.length > 0 ? 'left' : 'none'}
      initialIsOpen={validationErrors !== null && validationErrors.length > 0}
      isDisabled={validationErrors == null || validationErrors.length === 0}
      css={styles.accordion}
    >
      <div css={styles.separator} />
      <div css={styles.accordionContent} className="eui-yScrollWithShadows">
        <EuiFlexGroup direction="column" gutterSize="s">
          {sortedValidationErrors?.map((error, index) => (
            <button
              type="button"
              key={`${error.startLineNumber}-${error.startColumn}-${error.message}-${index}-${error.severity}`}
              css={styles.validationError}
              onClick={() => onErrorClick?.(error)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onErrorClick?.(error);
                }
              }}
              tabIndex={0}
            >
              <EuiFlexItem grow={false}>
                <EuiIcon
                  type={error.severity === 'error' ? 'errorFilled' : 'warningFilled'}
                  color={error.severity === 'error' ? 'danger' : euiTheme.colors.vis.euiColorVis8}
                  size="s"
                  css={styles.validationErrorIcon}
                  aria-hidden={true}
                />
              </EuiFlexItem>
              <EuiFlexItem css={styles.validationErrorText}>
                <EuiText color="text" size="xs">
                  <span>{error.message}</span>
                </EuiText>
                <EuiText color="subdued" size="xs">
                  <span>
                    <FormattedMessage
                      id="xpack.cases.templates.validation.lineAndColumn"
                      defaultMessage="Ln {lineNumber}, Col {columnNumber}"
                      values={{
                        lineNumber: error.startLineNumber,
                        columnNumber: error.startColumn,
                      }}
                    />
                  </span>
                </EuiText>
              </EuiFlexItem>
            </button>
          ))}
        </EuiFlexGroup>
      </div>
    </EuiAccordion>
  );
};

TemplateYamlValidationAccordion.displayName = 'TemplateYamlValidationAccordion';

const componentStyles = {
  accordion: ({ euiTheme }: UseEuiTheme) =>
    css({
      padding: `0 ${euiTheme.size.m}`,
      borderTop: `1px solid ${euiTheme.colors.borderBasePlain}`,
      backgroundColor: euiTheme.colors.backgroundBasePlain,
    }),
  buttonContent: ({ euiTheme }: UseEuiTheme) => css`
    width: 100%;
    min-height: 48px;
    padding: ${euiTheme.size.s} 0;
    color: ${euiTheme.colors.textParagraph};
    flex-wrap: nowrap !important;
  `,
  buttonContentText: (euiThemeContext: UseEuiTheme) =>
    css({
      ...euiFontSize(euiThemeContext, 'xs'),
      whiteSpace: 'nowrap',
    }),
  accordionContent: ({ euiTheme }: UseEuiTheme) =>
    css({
      maxHeight: '200px',
      overflowY: 'auto',
      padding: euiTheme.size.s,
      position: 'relative',
    }),
  separator: ({ euiTheme }: UseEuiTheme) =>
    css({
      borderTop: `1px solid ${euiTheme.colors.borderBasePlain}`,
    }),
  validationError: (euiThemeContext: UseEuiTheme) =>
    css({
      ...euiFontSize(euiThemeContext, 'xs'),
      textAlign: 'left',
      cursor: 'pointer',
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: euiThemeContext.euiTheme.size.s,
      border: 'none',
      background: 'none',
      padding: euiThemeContext.euiTheme.size.xs,
      width: '100%',
      '&:hover': {
        textDecoration: 'underline',
        backgroundColor: euiThemeContext.euiTheme.colors.backgroundBasePlain,
      },
    }),
  validationErrorText: (euiThemeContext: UseEuiTheme) =>
    css({
      display: 'flex',
      flexDirection: 'row',
      gap: euiThemeContext.euiTheme.size.s,
    }),
  validationErrorIcon: css({
    marginTop: '0.125rem',
    flexShrink: 0,
  }),
};
