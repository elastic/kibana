/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiListGroup,
  EuiListGroupItem,
  EuiPopover,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { AiButton } from '@kbn/shared-ux-ai-components';
import { i18n } from '@kbn/i18n';
import { KbnWarningCallout } from '@kbn/ui-callout';
import type { AppDocument } from '@kbn/custom-app-common';
import { IconButton } from './fields/fields';
import { OutlinePane } from './outline_pane';
import { PropertiesPanel } from './properties_panel';
import { useDocumentEditor } from './use_document_editor';

export interface EditorFlyoutProps {
  initialDocument: AppDocument;
  /** Shows the draft on the panel itself, without saving it. */
  onPreview: (document: AppDocument) => void;
  /** Sends the draft to chat. Absent when chat is not available, and then nothing offers it. */
  onGenerateWithChat?: (document: AppDocument) => void;
  onSave: (document: AppDocument) => void;
  onCancel: () => void;
  ariaLabelledBy: string;
  /**
   * Whether applying saves to an app that other dashboards use too, which the author is told, since
   * it is not what applying means for an app of the panel itself.
   */
  isShared?: boolean;
}

export const EditorFlyout = ({
  initialDocument,
  onPreview,
  onGenerateWithChat,
  onSave,
  onCancel,
  ariaLabelledBy,
  isShared = false,
}: EditorFlyoutProps) => {
  const { euiTheme } = useEuiTheme();
  const editor = useDocumentEditor(initialDocument);
  const [isIssuesOpen, setIsIssuesOpen] = useState(false);
  const [isConfirmingCancel, setIsConfirmingCancel] = useState(false);

  const { issues, selectedNode } = editor;
  const pane = css({
    minHeight: 0,
    overflowY: 'auto',
    padding: euiTheme.size.base,
  });

  const cancel = () => (editor.isDirty ? setIsConfirmingCancel(true) : onCancel());

  return (
    <div
      css={css({ display: 'flex', flexDirection: 'column', height: '100%' })}
      data-test-subj="customAppEditor"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="m">
              <h2 id={ariaLabelledBy}>
                {i18n.translate('xpack.customApp.editor.title', {
                  defaultMessage: 'Edit custom app',
                })}
              </h2>
            </EuiTitle>
            <EuiText size="s" color="subdued">
              <p>
                {i18n.translate('xpack.customApp.editor.description', {
                  defaultMessage:
                    'Build an app from components, each driven by its own ES|QL query.',
                })}
              </p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              {onGenerateWithChat && (
                <EuiFlexItem grow={false}>
                  <AiButton
                    size="s"
                    iconType="sparkles"
                    data-test-subj="customAppEditorGenerateWithChat"
                    onClick={() => onGenerateWithChat(editor.document)}
                  >
                    {i18n.translate('xpack.customApp.editor.generateWithChat', {
                      defaultMessage: 'Generate with chat',
                    })}
                  </AiButton>
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>
                <IconButton
                  iconType="undo"
                  label={i18n.translate('xpack.customApp.editor.undo', { defaultMessage: 'Undo' })}
                  isDisabled={!editor.canUndo}
                  onClick={editor.undo}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <IconButton
                  iconType="redo"
                  label={i18n.translate('xpack.customApp.editor.redo', { defaultMessage: 'Redo' })}
                  isDisabled={!editor.canRedo}
                  onClick={editor.redo}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      {isShared && (
        <div
          css={css({
            padding: `${euiTheme.size.s} ${euiTheme.size.base}`,
            borderBlockEnd: euiTheme.border.thin,
          })}
        >
          <KbnWarningCallout
            size="s"
            announceOnMount={false}
            title={i18n.translate('xpack.customApp.editor.sharedTitle', {
              defaultMessage: 'This app is shared',
            })}
            data-test-subj="customAppEditorShared"
          >
            <p>
              {i18n.translate('xpack.customApp.editor.sharedBody', {
                defaultMessage:
                  'Applying your changes saves them to the library, for every dashboard that uses this app.',
              })}
            </p>
          </KbnWarningCallout>
        </div>
      )}

      <div
        css={css({
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: '15rem minmax(0, 1fr)',
        })}
      >
        <nav
          css={[
            pane,
            css({
              backgroundColor: euiTheme.colors.backgroundBaseSubdued,
              borderInlineEnd: euiTheme.border.thin,
            }),
          ]}
          aria-label={i18n.translate('xpack.customApp.editor.outlinePaneLabel', {
            defaultMessage: 'Outline',
          })}
        >
          <OutlinePane
            root={editor.document.root}
            selectedId={editor.selectedId}
            issues={issues}
            isRootSelected={editor.selectedId === editor.document.root.id}
            onSelect={editor.select}
            onAdd={(type) => editor.add(type)}
            onDuplicate={() => editor.duplicateSelected()}
            onMove={(direction) => editor.moveSelected(direction)}
            onRemove={() => editor.removeSelected()}
          />
        </nav>

        <div
          css={css({
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            borderInlineStart: euiTheme.border.thin,
          })}
        >
          <div css={pane}>
            <PropertiesPanel
              node={selectedNode}
              document={editor.document}
              issues={issues}
              onChange={(props) => editor.update(selectedNode.id, props)}
              onEdit={editor.edit}
            />
          </div>
        </div>
      </div>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty onClick={cancel} data-test-subj="customAppEditorCancel">
                  {i18n.translate('xpack.customApp.editor.cancel', { defaultMessage: 'Cancel' })}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                {issues.length > 0 && (
                  <EuiPopover
                    aria-label={i18n.translate('xpack.customApp.editor.issuesLabel', {
                      defaultMessage: 'Problems to fix before saving',
                    })}
                    isOpen={isIssuesOpen}
                    closePopover={() => setIsIssuesOpen(false)}
                    anchorPosition="upLeft"
                    button={
                      <EuiButtonEmpty
                        color="danger"
                        iconType="warning"
                        data-test-subj="customAppIssues"
                        onClick={() => setIsIssuesOpen(!isIssuesOpen)}
                      >
                        {i18n.translate('xpack.customApp.editor.issuesCount', {
                          defaultMessage: '{count, plural, one {# problem} other {# problems}}',
                          values: { count: issues.length },
                        })}
                      </EuiButtonEmpty>
                    }
                  >
                    <EuiListGroup maxWidth={420}>
                      {issues.map(({ message, nodeId }) => (
                        <EuiListGroupItem
                          key={message}
                          label={message}
                          wrapText
                          onClick={
                            nodeId === undefined
                              ? undefined
                              : () => {
                                  editor.select(nodeId);
                                  setIsIssuesOpen(false);
                                }
                          }
                        />
                      ))}
                    </EuiListGroup>
                  </EuiPopover>
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButton
                  color="success"
                  iconType="play"
                  data-test-subj="customAppEditorPreview"
                  onClick={() => onPreview(editor.document)}
                >
                  {i18n.translate('xpack.customApp.editor.runPreview', {
                    defaultMessage: 'Run preview',
                  })}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  isDisabled={!editor.isDirty || issues.length > 0}
                  data-test-subj="customAppEditorSave"
                  onClick={() => onSave(editor.document)}
                >
                  {i18n.translate('xpack.customApp.editor.apply', {
                    defaultMessage: 'Apply and close',
                  })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>

      {isConfirmingCancel && (
        <EuiConfirmModal
          aria-label={i18n.translate('xpack.customApp.editor.discardLabel', {
            defaultMessage: 'Discard your changes',
          })}
          title={i18n.translate('xpack.customApp.editor.discardTitle', {
            defaultMessage: 'Discard your changes?',
          })}
          cancelButtonText={i18n.translate('xpack.customApp.editor.keepEditing', {
            defaultMessage: 'Keep editing',
          })}
          confirmButtonText={i18n.translate('xpack.customApp.editor.discard', {
            defaultMessage: 'Discard changes',
          })}
          buttonColor="danger"
          onCancel={() => setIsConfirmingCancel(false)}
          onConfirm={onCancel}
        >
          {i18n.translate('xpack.customApp.editor.discardBody', {
            defaultMessage: 'What you changed in this editor will be lost.',
          })}
        </EuiConfirmModal>
      )}
    </div>
  );
};
