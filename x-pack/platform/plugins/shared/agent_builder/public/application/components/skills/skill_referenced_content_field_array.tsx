/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import {
  useController,
  useFieldArray,
  useFormContext,
  useWatch,
  type Control,
} from 'react-hook-form';
import { maxReferencedContentItems, AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import { estimateTokens } from '@kbn/agent-builder-common/attachments';
import { getEbtProps } from '@kbn/ebt-click';
import { useDebouncedValue } from '@kbn/react-hooks';
import { labels } from '../../utils/i18n';
import type { ReferencedContentItem, SkillFormData } from './skill_form_validation';
import { ReferencedContentFileCard } from './referenced_content_file_card';
import { SkillReferencedContentReadOnly } from './skill_referenced_content_read_only';

const addFileEbtProps = getEbtProps({
  element: AGENT_BUILDER_UI_EBT.element.pageContent,
  action: AGENT_BUILDER_UI_EBT.action.globalManagement.ADD_REFERENCED_FILE,
  detail: AGENT_BUILDER_UI_EBT.entity.SKILL,
});

const removeFileEbtProps = getEbtProps({
  element: AGENT_BUILDER_UI_EBT.element.pageContent,
  action: AGENT_BUILDER_UI_EBT.action.globalManagement.REMOVE_REFERENCED_FILE,
  detail: AGENT_BUILDER_UI_EBT.entity.SKILL,
});

const ReferencedContentEmptyState: React.FC<{ onAdd: () => void }> = ({ onAdd }) => {
  const { euiTheme } = useEuiTheme();

  const containerStyle = css`
    border: 2px dashed ${euiTheme.colors.borderBaseSubdued};
    border-radius: ${euiTheme.border.radius.medium};
    padding: ${euiTheme.size.l};
  `;

  return (
    <div css={containerStyle} data-test-subj="agentBuilderSkillReferencedContentEmptyState">
      <EuiTitle size="xxs">
        <h3>{labels.skills.referencedFileSection.emptyStateTitle}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        {labels.skills.referencedFileSection.emptyStateDescription}
      </EuiText>
      <EuiSpacer size="m" />
      <EuiButton
        iconType="plusInCircle"
        onClick={onAdd}
        data-test-subj="agentBuilderSkillReferencedContentAddFile"
        {...addFileEbtProps}
      >
        {labels.skills.referencedFileSection.addFileButton}
      </EuiButton>
      <EuiSpacer size="m" />
      <EuiText size="xs" color="subdued">
        <EuiIcon type="info" color="subdued" size="s" aria-hidden={true} />{' '}
        {labels.skills.referencedFileSection.uploadingNotAvailable}
      </EuiText>
    </div>
  );
};

const DEFAULT_REFERENCED_FILE: ReferencedContentItem = {
  name: '',
  relativePath: './',
  content: '',
};

interface ReferencedContentFileRowProps {
  index: number;
  control: Control<SkillFormData>;
  skillName: string;
  onRemove: () => void;
  isEditing: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
}

const ReferencedContentFileRow: React.FC<ReferencedContentFileRowProps> = ({
  index,
  control,
  skillName,
  onRemove,
  isEditing,
  onStartEdit,
  onStopEdit,
}) => {
  const snapshotRef = useRef<ReferencedContentItem>({ ...DEFAULT_REFERENCED_FILE });
  const { trigger, clearErrors } = useFormContext<SkillFormData>();

  const nameField = useController({ control, name: `referenced_content.${index}.name` });
  const pathField = useController({ control, name: `referenced_content.${index}.relativePath` });
  const contentField = useController({ control, name: `referenced_content.${index}.content` });

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

  const displayName = nameField.field.value
    ? `${nameField.field.value}.md`
    : labels.skills.referencedFileSection.unnamedFilePlaceholder;

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
                aria-label={labels.skills.referencedFileSection.editFileAriaLabel}
                data-test-subj={`agentBuilderSkillReferencedContentEdit-${index}`}
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
            >
              {labels.skills.referencedFileSection.doneButton}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    />
  );
};

const SkillReferencedContentReadOnlySection: React.FC<{ control: Control<SkillFormData> }> = ({
  control,
}) => {
  const items: ReferencedContentItem[] = useWatch({ control, name: 'referenced_content' }) ?? [];

  return (
    <div data-test-subj="agentBuilderSkillReferencedContentSection">
      <SkillReferencedContentReadOnly items={items} />
    </div>
  );
};

const SkillReferencedContentFieldArrayEdit: React.FC<{ control: Control<SkillFormData> }> = ({
  control,
}) => {
  const skillName = useWatch({ control, name: 'name' }) ?? '';
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'referenced_content',
  });

  const atLimit = fields.length >= maxReferencedContentItems;

  const handleAdd = () => {
    const nextIndex = fields.length;
    append(DEFAULT_REFERENCED_FILE);
    setActiveIndex(nextIndex);
  };

  const handleRemove = (index: number) => {
    remove(index);
    setActiveIndex((prev) => {
      if (prev === null) return null;
      if (prev === index) return null;
      if (index < prev) return prev - 1;
      return prev;
    });
  };

  return (
    <div data-test-subj="agentBuilderSkillReferencedContentSection">
      {fields.length === 0 ? (
        <ReferencedContentEmptyState onAdd={handleAdd} />
      ) : (
        <>
          <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              <EuiButton
                iconType="plusInCircle"
                onClick={handleAdd}
                disabled={atLimit || activeIndex !== null}
                title={
                  atLimit
                    ? labels.skills.referencedFileSection.addFileButtonDisabledTooltip(
                        maxReferencedContentItems
                      )
                    : undefined
                }
                data-test-subj="agentBuilderSkillReferencedContentAddFile"
                {...addFileEbtProps}
              >
                {labels.skills.referencedFileSection.addFileButton}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText
                size="s"
                color="subdued"
                data-test-subj="agentBuilderSkillReferencedContentCount"
              >
                {labels.skills.referencedFileSection.filesAddedCount(
                  fields.length,
                  maxReferencedContentItems
                )}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="l" />
          <EuiFlexGroup direction="column" gutterSize="m">
            {fields.map((field, index) => (
              <EuiFlexItem key={field.id} grow={false}>
                <ReferencedContentFileRow
                  index={index}
                  control={control}
                  skillName={skillName}
                  onRemove={() => handleRemove(index)}
                  isEditing={activeIndex === index}
                  onStartEdit={() => setActiveIndex(index)}
                  onStopEdit={() => setActiveIndex(null)}
                />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </>
      )}
    </div>
  );
};

export interface SkillReferencedContentFieldArrayProps {
  control: Control<SkillFormData>;
  readOnly?: boolean;
}

export const SkillReferencedContentFieldArray: React.FC<SkillReferencedContentFieldArrayProps> = ({
  control,
  readOnly = false,
}) => {
  if (readOnly) {
    return <SkillReferencedContentReadOnlySection control={control} />;
  }
  return <SkillReferencedContentFieldArrayEdit control={control} />;
};
