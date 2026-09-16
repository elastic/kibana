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
  EuiHorizontalRule,
  EuiIcon,
  EuiMarkdownFormat,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { SkillReferencedContent } from '@kbn/agent-builder-common';
import { estimateTokens } from '@kbn/agent-builder-common/attachments';
import { labels } from '../../../utils/i18n';
import { getReferencedFileDisplayName } from '../../skills/referenced_content_path_utils';

interface ReferencedFileRowProps {
  item: SkillReferencedContent;
  index: number;
}

const ReferencedFileRow: React.FC<ReferencedFileRowProps> = ({ item, index }) => {
  const accordionId = useGeneratedHtmlId({ prefix: 'agentBuilderSkillDetailReferencedFile' });
  const { euiTheme } = useEuiTheme();
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
        css: css`
          padding: ${euiTheme.size.s} ${euiTheme.size.m};
        `,
      }}
      css={css`
        border-radius: ${euiTheme.border.radius.medium};
        overflow: hidden;
        padding: 0 ${euiTheme.size.s};
      `}
      borders="all"
      arrowDisplay="right"
      data-test-subj={`agentBuilderSkillDetailReferencedFile-${index}`}
    >
      <div
        css={css`
          border-top: ${euiTheme.border.thin};
          padding: ${euiTheme.size.m};
        `}
      >
        <EuiMarkdownFormat textSize="s">{item.content}</EuiMarkdownFormat>
      </div>
    </EuiAccordion>
  );
};

export interface SkillReferencedFilesProps {
  items: SkillReferencedContent[];
}

export const SkillReferencedFiles: React.FC<SkillReferencedFilesProps> = ({ items }) => {
  const totalTokenCount = useMemo(
    () => items.reduce((sum, item) => sum + estimateTokens(item.content), 0),
    [items]
  );

  if (items.length === 0) return null;

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiHorizontalRule margin="l" />
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h4>{labels.skills.referencedFilesSectionTitle(items.length)}</h4>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued">
            {labels.skills.referencedFileSection.compactTokenCount(totalTokenCount)}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup direction="column" gutterSize="s">
        {items.map((item, index) => (
          <EuiFlexItem key={`${item.name || ''}:${item.relativePath}:${index}`} grow={false}>
            <ReferencedFileRow item={item} index={index} />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
};
