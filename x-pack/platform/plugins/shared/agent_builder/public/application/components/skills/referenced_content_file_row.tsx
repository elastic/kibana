/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef, useMemo } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { useController, useFormContext } from 'react-hook-form';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import { estimateTokens } from '@kbn/agent-builder-common/attachments';
import { getEbtProps } from '@kbn/ebt-click';
import { useDebouncedValue } from '@kbn/react-hooks';
import { labels } from '../../utils/i18n';
import type { ReferencedContentItem, SkillFormData } from './skill_form_validation';
import { ReferencedContentFileCard } from './referenced_content_file_card';
import { getReferencedFileDisplayName } from './referenced_content_path_utils';

const editFileEbtProps = getEbtProps({
  element: AGENT_BUILDER_UI_EBT.element.pageContent,
  action: AGENT_BUILDER_UI_EBT.action.globalManagement.EDIT_REFERENCED_FILE,
  detail: AGENT_BUILDER_UI_EBT.entity.SKILL,
});

const saveFileEbtProps = getEbtProps({
  element: AGENT_BUILDER_UI_EBT.element.pageContent,
  action: AGENT_BUILDER_UI_EBT.action.globalManagement.SAVE_REFERENCED_FILE,
  detail: AGENT_BUILDER_UI_EBT.entity.SKILL,
});

const cancelFileEbtProps = getEbtProps({
  element: AGENT_BUILDER_UI_EBT.element.pageContent,
  action: AGENT_BUILDER_UI_EBT.action.globalManagement.CANCEL_REFERENCED_FILE,
  detail: AGENT_BUILDER_UI_EBT.entity.SKILL,
});

const removeFileEbtProps = getEbtProps({
  element: AGENT_BUILDER_UI_EBT.element.pageContent,
  action: AGENT_BUILDER_UI_EBT.action.globalManagement.REMOVE_REFERENCED_FILE,
  detail: AGENT_BUILDER_UI_EBT.entity.SKILL,
});

export const DEFAULT_REFERENCED_FILE: ReferencedContentItem = {
  name: '',
  relativePath: './',
  content: '',
};

export interface ReferencedContentFileRowProps {
  index: number;
  skillName: string;
  onRemove: () => void;
  isEditing: boolean;
  canEdit: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
}

export const ReferencedContentFileRow: React.FC<ReferencedContentFileRowProps> = ({
  index,
  skillName,
  onRemove,
  isEditing,
  canEdit,
  onStartEdit,
  onStopEdit,
}) => {
  const snapshotRef = useRef<ReferencedContentItem>({ ...DEFAULT_REFERENCED_FILE });
  const { trigger, clearErrors } = useFormContext<SkillFormData>();

  const nameField = useController({ name: `referenced_content.${index}.name` });
  const pathField = useController({ name: `referenced_content.${index}.relativePath` });
  const contentField = useController({ name: `referenced_content.${index}.content` });

  const debouncedContent = useDebouncedValue(contentField.field.value, 300);
  const tokenCount = useMemo(() => estimateTokens(debouncedContent), [debouncedContent]);

  const handleDone = async () => {
    const isValid = await trigger([
      `referenced_content.${index}.name`,
      `referenced_content.${index}.relativePath`,
      `referenced_content.${index}.content`,
    ]);
    if (isValid) onStopEdit();
  };

  const handleCancel = () => {
    const snapshot = snapshotRef.current;
    if (!snapshot.name && !snapshot.content) {
      onRemove();
      return;
    }
    nameField.field.onChange(snapshot.name);
    pathField.field.onChange(snapshot.relativePath);
    contentField.field.onChange(snapshot.content);
    clearErrors([
      `referenced_content.${index}.name`,
      `referenced_content.${index}.relativePath`,
      `referenced_content.${index}.content`,
    ]);
    onStopEdit();
  };

  const displayName = getReferencedFileDisplayName(nameField.field.value);

  if (!isEditing) {
    return (
      <EuiPanel
        paddingSize="s"
        hasBorder
        data-test-subj="agentBuilderSkillReferencedContentFileRow"
      >
        <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="document" color="subdued" aria-hidden={true} />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s" color={nameField.field.value ? undefined : 'subdued'}>
              {displayName}
            </EuiText>
            <EuiText size="xs" color="subdued">
              {labels.skills.referencedFileSection.compactTokenCount(tokenCount)}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip
              content={labels.skills.referencedFileSection.editFileAriaLabel}
              disableScreenReaderOutput
            >
              <EuiButtonIcon
                iconType="pencil"
                onClick={() => {
                  snapshotRef.current = {
                    name: nameField.field.value,
                    relativePath: pathField.field.value,
                    content: contentField.field.value,
                  };
                  onStartEdit();
                }}
                disabled={!canEdit}
                aria-label={labels.skills.referencedFileSection.editFileAriaLabel}
                data-test-subj={`agentBuilderSkillReferencedContentEdit-${index}`}
                {...editFileEbtProps}
              />
            </EuiToolTip>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip
              content={labels.skills.referencedFileSection.removeFileAriaLabel}
              disableScreenReaderOutput
            >
              <EuiButtonIcon
                iconType="trash"
                color="danger"
                onClick={onRemove}
                aria-label={labels.skills.referencedFileSection.removeFileAriaLabel}
                data-test-subj={`agentBuilderSkillReferencedContentRemove-${index}`}
                {...removeFileEbtProps}
              />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }

  return (
    <ReferencedContentFileCard
      skillName={skillName}
      fileName={nameField.field.value}
      relativePath={pathField.field.value}
      content={contentField.field.value}
      onFileNameChange={nameField.field.onChange}
      onRelativePathChange={pathField.field.onChange}
      onContentChange={contentField.field.onChange}
      onFileNameBlur={nameField.field.onBlur}
      onRelativePathBlur={pathField.field.onBlur}
      onContentBlur={contentField.field.onBlur}
      fileNameError={nameField.fieldState.error?.message}
      relativePathError={pathField.fieldState.error?.message}
      footer={
        <EuiFlexGroup gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              onClick={handleCancel}
              data-test-subj={`agentBuilderSkillReferencedContentCancel-${index}`}
              {...cancelFileEbtProps}
            >
              {labels.skills.referencedFileSection.cancelButton}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              onClick={handleDone}
              disabled={
                !nameField.field.value ||
                Boolean(nameField.fieldState.error) ||
                Boolean(pathField.fieldState.error)
              }
              data-test-subj={`agentBuilderSkillReferencedContentDone-${index}`}
              {...saveFileEbtProps}
            >
              {labels.skills.referencedFileSection.doneButton}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    />
  );
};
