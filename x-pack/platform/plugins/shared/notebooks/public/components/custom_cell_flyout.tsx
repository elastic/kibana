/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  EuiAccordion,
  EuiBetaBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiLink,
  EuiResizeObserver,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { CodeEditor } from '@kbn/code-editor';
import type { Datatable } from '@kbn/expressions-plugin/common';
import { useNotebookServices } from '../services';
import { NotebookFlyout } from './notebook_flyout';
import { ResultGrid } from './result_preview';

const EDITOR_DEFAULT_HEIGHT = 400;

const COPY_TEMPLATE_LABEL = i18n.translate('xpack.notebook.customCell.flyout.copyTemplate', {
  defaultMessage: 'Copy template',
});

interface CustomCellFlyoutProps {
  template: string;
  sourceName: string | undefined;
  table: Datatable | undefined;
  onPreview: (template: string) => void;
  onApply: (template: string) => void;
  onClose: () => void;
}

/** Edits a custom cell's Liquid template, previewing drafts in the cell before applying them. */
export const CustomCellFlyout = ({
  template,
  sourceName,
  table,
  onPreview,
  onApply,
  onClose,
}: CustomCellFlyoutProps) => {
  const { core } = useNotebookServices();
  const { euiTheme } = useEuiTheme();
  const titleId = useGeneratedHtmlId({ prefix: 'notebookCustomFlyoutTitle' });
  const [draft, setDraft] = useState(template);
  const [editorHeight, setEditorHeight] = useState(EDITOR_DEFAULT_HEIGHT);
  const editorHeightRef = useRef(EDITOR_DEFAULT_HEIGHT);

  const onEditorResize = useCallback(({ height }: { height: number }) => {
    if (height === editorHeightRef.current) return;
    editorHeightRef.current = height;
    setEditorHeight(height);
  }, []);

  const editorContainerCss = css`
    position: relative;
    resize: vertical;
    min-height: ${EDITOR_DEFAULT_HEIGHT}px;
    height: ${EDITOR_DEFAULT_HEIGHT}px;
    border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued};
    border-radius: ${euiTheme.border.radius.medium};
    overflow: hidden;
  `;

  const copyButtonCss = css`
    position: absolute;
    top: ${euiTheme.size.xs};
    right: ${euiTheme.size.m};
    z-index: ${euiTheme.levels.content};
  `;

  return (
    <NotebookFlyout
      type="push"
      ownFocus
      onClose={onClose}
      aria-labelledby={titleId}
      data-test-subj="notebookCustomEditFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="m">
              <h2 id={titleId}>
                {i18n.translate('xpack.notebook.customCell.flyout.title', {
                  defaultMessage: 'Edit custom panel',
                })}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip
              content={i18n.translate('xpack.notebook.customCell.flyout.previewTooltip', {
                defaultMessage:
                  'Custom panels are in technical preview and may change or be removed in future releases.',
              })}
            >
              <EuiBetaBadge
                tabIndex={0}
                iconType="flask"
                label={i18n.translate('xpack.notebook.customCell.flyout.previewLabel', {
                  defaultMessage: 'Technical preview',
                })}
                size="s"
              />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="xs" />
        <EuiText size="s" color="subdued">
          <p>
            {sourceName
              ? i18n.translate('xpack.notebook.customCell.flyout.description', {
                  defaultMessage: 'Present the results of {source} with HTML.',
                  values: { source: sourceName },
                })
              : i18n.translate('xpack.notebook.customCell.flyout.descriptionNoSource', {
                  defaultMessage: 'Present your data with HTML.',
                })}{' '}
            <EuiLink href={core.docLinks.links.visualize.customPanels} target="_blank" external>
              {i18n.translate('xpack.notebook.customCell.flyout.learnMore', {
                defaultMessage: 'Learn more',
              })}
            </EuiLink>
          </p>
        </EuiText>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiFormRow
          fullWidth
          label={i18n.translate('xpack.notebook.customCell.flyout.templateLabel', {
            defaultMessage: 'Template (HTML)',
          })}
          helpText={i18n.translate('xpack.notebook.customCell.flyout.templateHelpText', {
            defaultMessage:
              'HTML and CSS, with Liquid tags to insert the source results. For each row, row["column"].value is the value and row["column"].pct is its percentage of the column\'s highest value, useful for bar widths.',
          })}
        >
          <EuiResizeObserver onResize={onEditorResize}>
            {(resizeRef) => (
              <div ref={resizeRef} css={editorContainerCss}>
                <CodeEditor
                  languageId="liquid"
                  value={draft}
                  onChange={setDraft}
                  height={editorHeight}
                  placeholder={i18n.translate('xpack.notebook.customCell.flyout.placeholder', {
                    defaultMessage: '<!-- Write your HTML, CSS, and Liquid here. -->',
                  })}
                  options={{
                    fontSize: 12,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                    lineNumbers: 'on',
                    folding: true,
                  }}
                />
                <EuiToolTip
                  content={COPY_TEMPLATE_LABEL}
                  disableScreenReaderOutput
                  anchorProps={{ css: copyButtonCss }}
                >
                  <EuiButtonIcon
                    iconType="copy"
                    aria-label={COPY_TEMPLATE_LABEL}
                    onClick={() => navigator.clipboard?.writeText(draft)}
                    data-test-subj="notebookCustomCopyTemplate"
                  />
                </EuiToolTip>
              </div>
            )}
          </EuiResizeObserver>
        </EuiFormRow>
        {table && (
          <>
            <EuiSpacer size="m" />
            <EuiAccordion
              id={`${titleId}-data`}
              buttonContent={i18n.translate('xpack.notebook.customCell.flyout.sourceData', {
                defaultMessage: 'Source data',
              })}
              paddingSize="s"
            >
              <ResultGrid table={table} />
            </EuiAccordion>
          </>
        )}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} data-test-subj="notebookCustomCancel">
              {i18n.translate('xpack.notebook.customCell.flyout.cancel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButton
                  color="success"
                  iconType="play"
                  disabled={!draft.trim()}
                  onClick={() => onPreview(draft)}
                  data-test-subj="notebookCustomRunPreview"
                >
                  {i18n.translate('xpack.notebook.customCell.flyout.runPreview', {
                    defaultMessage: 'Run preview',
                  })}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  disabled={draft === template}
                  onClick={() => onApply(draft)}
                  data-test-subj="notebookCustomApply"
                >
                  {i18n.translate('xpack.notebook.customCell.flyout.apply', {
                    defaultMessage: 'Apply and close',
                  })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </NotebookFlyout>
  );
};
