/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiMarkdownFormat,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { getRunbookContent } from '@kbn/alerting-v2-rule-form';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';
import { useRule } from '../../../rule_details/rule_context';

const RUNBOOK_PREVIEW_HEIGHT = 172;

export const RuleSummaryRunbookCard: React.FC = () => {
  const rule = useRule();
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
    return (
      <EuiEmptyPrompt
        iconType="documentation"
        title={
          <h3>
            {i18n.translate('xpack.alertingV2.ruleSummaryFlyout.runbook.emptyTitle', {
              defaultMessage: 'No runbook',
            })}
          </h3>
        }
        body={
          <p>
            {i18n.translate('xpack.alertingV2.ruleSummaryFlyout.runbook.emptyBody', {
              defaultMessage: 'No runbook has been added to this rule yet.',
            })}
          </p>
        }
        data-test-subj="ruleSummaryFlyoutRunbookEmpty"
      />
    );
  }

  const showToggle = isExpanded || isOverflowing;

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="m" data-test-subj="ruleSummaryFlyoutRunbook">
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h5>
              {i18n.translate('xpack.alertingV2.ruleSummaryFlyout.runbook.title', {
                defaultMessage: 'Runbook',
              })}
            </h5>
          </EuiTitle>
        </EuiFlexItem>
        {showToggle ? (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="xs"
              flush="both"
              onClick={() => setIsExpanded((open) => !open)}
              data-test-subj="ruleSummaryFlyoutRunbookToggle"
            >
              {isExpanded
                ? i18n.translate('xpack.alertingV2.ruleSummaryFlyout.runbook.hideFullGuide', {
                    defaultMessage: 'Hide full guide',
                  })
                : i18n.translate('xpack.alertingV2.ruleSummaryFlyout.runbook.showFullGuide', {
                    defaultMessage: 'Show full guide',
                  })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
      <EuiSpacer size="s" />
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
        data-test-subj="ruleSummaryFlyoutRunbookContent"
      >
        <EuiMarkdownFormat>{content}</EuiMarkdownFormat>
      </div>
    </EuiPanel>
  );
};
