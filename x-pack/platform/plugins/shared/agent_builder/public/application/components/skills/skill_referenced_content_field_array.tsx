/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import { useFieldArray, useWatch } from 'react-hook-form';
import { maxReferencedContentItems, AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import { getEbtProps } from '@kbn/ebt-click';
import { labels } from '../../utils/i18n';
import type { ReferencedContentItem, SkillFormData } from './skill_form_validation';
import { SkillReferencedContentReadOnly } from './skill_referenced_content_read_only';
import { ReferencedContentEmptyState } from './referenced_content_empty_state';
import { ReferencedContentFileRow, DEFAULT_REFERENCED_FILE } from './referenced_content_file_row';

const addFileEbtProps = getEbtProps({
  element: AGENT_BUILDER_UI_EBT.element.pageContent,
  action: AGENT_BUILDER_UI_EBT.action.globalManagement.ADD_REFERENCED_FILE,
  detail: AGENT_BUILDER_UI_EBT.entity.SKILL,
});

const SkillReferencedContentReadOnlySection: React.FC = () => {
  const items: ReferencedContentItem[] = useWatch({ name: 'referenced_content' }) ?? [];

  return (
    <div data-test-subj="agentBuilderSkillReferencedContentSection">
      <SkillReferencedContentReadOnly items={items} />
    </div>
  );
};

const SkillReferencedContentFieldArrayEdit: React.FC = () => {
  const skillName = useWatch<SkillFormData, 'name'>({ name: 'name' }) ?? '';
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const { fields, append, remove } = useFieldArray({ name: 'referenced_content' });

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
                  skillName={skillName}
                  onRemove={() => handleRemove(index)}
                  isEditing={activeIndex === index}
                  canEdit={activeIndex === null}
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
  readOnly?: boolean;
}

export const SkillReferencedContentFieldArray: React.FC<SkillReferencedContentFieldArrayProps> = ({
  readOnly = false,
}) => {
  if (readOnly) {
    return <SkillReferencedContentReadOnlySection />;
  }
  return <SkillReferencedContentFieldArrayEdit />;
};
