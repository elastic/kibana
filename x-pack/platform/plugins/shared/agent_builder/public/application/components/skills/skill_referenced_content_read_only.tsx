/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiMarkdownFormat,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { estimateTokens } from '@kbn/agent-builder-common/attachments';
import { labels } from '../../utils/i18n';
import type { ReferencedContentItem } from './skill_form_validation';
import { getReferencedFileDisplayName } from './referenced_content_path_utils';

interface ReadOnlyFileRowProps {
  item: ReferencedContentItem;
  index: number;
}

const ReadOnlyFileRow: React.FC<ReadOnlyFileRowProps> = ({ item, index }) => {
  const accordionId = useGeneratedHtmlId({ prefix: 'agentBuilderSkillReferencedContentReadOnly' });
  const tokenCount = useMemo(() => estimateTokens(item.content), [item.content]);
  const displayName = getReferencedFileDisplayName(item.name);

  return (
    <EuiAccordion
      id={accordionId}
      buttonContent={
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="document" color="subdued" aria-hidden={true} />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">{displayName}</EuiText>
            <EuiText size="xs" color="subdued">
              {labels.skills.referencedFileSection.compactTokenCount(tokenCount)}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      buttonProps={{
        'aria-label':
          labels.skills.referencedFileSection.readOnlyFileAccordionAriaLabel(displayName),
      }}
      paddingSize="m"
      borders="all"
      arrowDisplay="right"
      data-test-subj={`agentBuilderSkillReferencedContentReadOnlyAccordion-${index}`}
    >
      <EuiMarkdownFormat textSize="s">{item.content}</EuiMarkdownFormat>
    </EuiAccordion>
  );
};

export interface SkillReferencedContentReadOnlyProps {
  items: ReferencedContentItem[];
}

export const SkillReferencedContentReadOnly: React.FC<SkillReferencedContentReadOnlyProps> = ({
  items,
}) => {
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
    <div data-test-subj="agentBuilderSkillReferencedContentReadOnlyList">
      <EuiText size="xs" color="subdued">
        {labels.skills.referencedFileSection.readOnlyFilesCount(items.length)}
      </EuiText>
      <EuiSpacer size="s" />
      <EuiFlexGroup direction="column" gutterSize="m">
        {items.map((item, index) => (
          <EuiFlexItem grow={false} key={`${item.name || ''}:${item.relativePath}:${index}`}>
            <ReadOnlyFileRow item={item} index={index} />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </div>
  );
};
