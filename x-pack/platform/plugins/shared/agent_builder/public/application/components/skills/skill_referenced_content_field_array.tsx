/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useController, useFieldArray, useWatch, type Control } from 'react-hook-form';
import { maxReferencedContentItems, AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import { getEbtProps } from '@kbn/ebt-click';
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
}

const ReferencedContentFileRow: React.FC<ReferencedContentFileRowProps> = ({
  index,
  control,
  skillName,
  onRemove,
}) => {
  const nameField = useController({ control, name: `referenced_content.${index}.name` });
  const pathField = useController({ control, name: `referenced_content.${index}.relativePath` });
  const contentField = useController({ control, name: `referenced_content.${index}.content` });

  return (
    <EuiFlexGroup alignItems="flexStart" gutterSize="m" responsive={false}>
      <EuiFlexItem grow={1}>
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
          contentError={contentField.fieldState.error?.message}
        />
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
  );
};

const SkillReferencedContentReadOnlySection: React.FC<{ control: Control<SkillFormData> }> = ({
  control,
}) => {
  const skillName = useWatch({ control, name: 'name' }) ?? '';
  const items: ReferencedContentItem[] = useWatch({ control, name: 'referenced_content' }) ?? [];

  return (
    <div data-test-subj="agentBuilderSkillReferencedContentSection">
      <SkillReferencedContentReadOnly skillName={skillName} items={items} />
    </div>
  );
};

const SkillReferencedContentFieldArrayEdit: React.FC<{ control: Control<SkillFormData> }> = ({
  control,
}) => {
  const skillName = useWatch({ control, name: 'name' }) ?? '';

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'referenced_content',
  });

  const atLimit = fields.length >= maxReferencedContentItems;

  return (
    <div data-test-subj="agentBuilderSkillReferencedContentSection">
      {fields.length === 0 ? (
        <ReferencedContentEmptyState onAdd={() => append(DEFAULT_REFERENCED_FILE)} />
      ) : (
        <>
          <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              <EuiButton
                iconType="plusInCircle"
                onClick={() => append(DEFAULT_REFERENCED_FILE)}
                disabled={atLimit}
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
          <EuiFlexGroup direction="column" gutterSize="xl">
            {fields.map((field, index) => (
              <EuiFlexItem key={field.id} grow={false}>
                <ReferencedContentFileRow
                  index={index}
                  control={control}
                  skillName={skillName}
                  onRemove={() => remove(index)}
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
