/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React from 'react';
import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiMarkdownFormat,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { labels } from '../../utils/i18n';
import type { ReferencedContentItem } from './skill_form_validation';
import { buildReferencedContentFullPathPreview } from './referenced_content_path_utils';

export interface SkillReferencedContentReadOnlyProps {
  skillName: string;
  items: ReferencedContentItem[];
}

export const SkillReferencedContentReadOnly: React.FC<SkillReferencedContentReadOnlyProps> = ({
  skillName,
  items,
}) => {
  const skillSegment =
    skillName.trim() || labels.skills.referencedFileCard.skillNamePathPlaceholder;

  if (items.length === 0) {
    return (
      <EuiText
        size="s"
        color="subdued"
        data-test-subj="agentBuilderSkillReferencedContentReadOnlyEmpty"
      >
        {labels.skills.referencedFileSection.emptyReadOnly}
      </EuiText>
    );
  }

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="xl"
      data-test-subj="agentBuilderSkillReferencedContentReadOnlyList"
    >
      {items.map((item, index) => {
        const fullPath = buildReferencedContentFullPathPreview(
          skillSegment,
          item.relativePath,
          item.name
        );
        return (
          <EuiFlexItem grow={false} key={`${fullPath}-${index}`}>
            <EuiAccordion
              id={`agentBuilderSkillReferencedContentReadOnly-${index}`}
              buttonContent={
                <EuiText
                  size="s"
                  css={css`
                    padding-left: 5px;
                  `}
                >
                  <strong>{fullPath}</strong>
                </EuiText>
              }
              buttonProps={{
                'aria-label':
                  labels.skills.referencedFileSection.readOnlyFileAccordionAriaLabel(fullPath),
              }}
              paddingSize="m"
              borders="all"
              arrowDisplay="right"
              data-test-subj={`agentBuilderSkillReferencedContentReadOnlyAccordion-${index}`}
            >
              <EuiSpacer size="m" />
              <EuiMarkdownFormat textSize="s">{item.content}</EuiMarkdownFormat>
            </EuiAccordion>
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};
