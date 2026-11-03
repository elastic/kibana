/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiMarkdownFormat,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { getRunbookContent } from '@kbn/alerting-v2-rule-form';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';
import type { RuleSummarySectionProps } from '../types';

const RUNBOOK_PREVIEW_HEIGHT = 172;

const RUNBOOK_TITLE = i18n.translate('xpack.alertingV2.ruleSummary.runbook.title', {
  defaultMessage: 'Runbook',
});

export const RuleSummaryRunbookCard: React.FC<RuleSummarySectionProps> = ({ rule }) => {
  const runbook = rule.artifacts?.find((artifact) => artifact.type === 'runbook');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [contentNode, setContentNode] = useState<HTMLDivElement | null>(null);

  const content = runbook ? getRunbookContent(runbook) : '';

  useEffect(() => {
    if (!contentNode || isExpanded) {
      return;
    }
    setIsOverflowing(contentNode.scrollHeight > RUNBOOK_PREVIEW_HEIGHT);
  }, [content, contentNode, isExpanded]);

  if (!runbook) {
    // Match the Alert episode flyout Investigation empty state: bordered panel,
    // "Runbook" title, and subdued body copy — not a large EuiEmptyPrompt.
    return (
      <EuiPanel
        hasBorder
        hasShadow={false}
        paddingSize="m"
        data-test-subj="ruleSummaryRunbookEmpty"
      >
        <EuiTitle size="xxs">
          <h4>{RUNBOOK_TITLE}</h4>
        </EuiTitle>
        <EuiSpacer size="m" />
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.alertingV2.ruleSummary.runbook.emptyDescription', {
            defaultMessage: 'No runbook available for this rule.',
          })}
        </EuiText>
      </EuiPanel>
    );
  }

  const showToggle = isExpanded || isOverflowing;

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="m" data-test-subj="ruleSummaryRunbook">
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h4>{RUNBOOK_TITLE}</h4>
          </EuiTitle>
        </EuiFlexItem>
        {showToggle ? (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="xs"
              flush="both"
              onClick={() => setIsExpanded((open) => !open)}
              data-test-subj="ruleSummaryRunbookToggle"
            >
              {isExpanded
                ? i18n.translate('xpack.alertingV2.ruleSummary.runbook.hideFullGuide', {
                    defaultMessage: 'Hide full guide',
                  })
                : i18n.translate('xpack.alertingV2.ruleSummary.runbook.showFullGuide', {
                    defaultMessage: 'Show full guide',
                  })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <div
        ref={setContentNode}
        css={
          isExpanded
            ? undefined
            : css`
                max-height: ${RUNBOOK_PREVIEW_HEIGHT}px;
                overflow-y: auto;
              `
        }
        data-test-subj="ruleSummaryRunbookContent"
      >
        <EuiMarkdownFormat>{content}</EuiMarkdownFormat>
      </div>
    </EuiPanel>
  );
};
