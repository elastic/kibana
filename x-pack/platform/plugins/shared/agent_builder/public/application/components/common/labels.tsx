/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiBadgeGroup,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';

const LabelGroup: React.FC<{ labels: string[] }> = ({ labels }) => {
  return (
    <EuiBadgeGroup
      gutterSize="s"
      role="list"
      aria-label="Labels"
      data-test-subj="agentBuilderLabelsList"
    >
      {labels.map((label) => (
        <EuiBadge
          key={label}
          color="hollow"
          role="listitem"
          data-test-subj={`agentBuilderLabel-${label}`}
        >
          {label}
        </EuiBadge>
      ))}
    </EuiBadgeGroup>
  );
};

const ViewMorePopover: React.FC<{
  labels: string[];
  totalLabels: number;
}> = ({ labels, totalLabels }) => {
  const { euiTheme } = useEuiTheme();
  const popoverPanelStyles = css`
    max-inline-size: calc(${euiTheme.size.xxxxl} * 5);
  `;
  const [isOpen, setIsOpen] = useState(false);

  const viewMoreAriaLabel = i18n.translate('xpack.agentBuilder.labels.viewMore.ariaLabel', {
    defaultMessage:
      'View {hiddenCount} more {hiddenCount, plural, one {label} other {labels}} ({totalCount} total)',
    values: {
      hiddenCount: labels.length,
      totalCount: totalLabels,
    },
  });

  return (
    <EuiPopover
      panelProps={{ css: popoverPanelStyles }}
      isOpen={isOpen}
      closePopover={() => {
        setIsOpen(false);
      }}
      data-test-subj="agentBuilderLabelsViewMorePopover"
      aria-label="Additional labels"
      button={
        <EuiButtonEmpty
          size="s"
          onClick={() => {
            setIsOpen((open) => !open);
          }}
          aria-label={viewMoreAriaLabel}
          aria-expanded={isOpen}
          data-test-subj="agentBuilderLabelsViewMoreButton"
        >
          <FormattedMessage
            id="xpack.agentBuilder.labels.viewMore.buttonLabel"
            defaultMessage="View more"
          />
        </EuiButtonEmpty>
      }
    >
      <LabelGroup labels={labels} />
    </EuiPopover>
  );
};

const NUM_VISIBLE_LABELS = 4;

export const Labels: React.FC<{
  labels: string[];
  numVisible?: number;
}> = ({ labels, numVisible = NUM_VISIBLE_LABELS }) => {
  if (labels.length === 0) {
    return null;
  }

  const visibleLabels = labels.slice(0, numVisible);
  const hiddenLabels = labels.slice(numVisible);

  if (hiddenLabels.length === 0) {
    return <LabelGroup labels={visibleLabels} />;
  }

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" data-test-subj={'agentBuilderLabelsContainer'}>
      <EuiFlexItem grow={false}>
        <LabelGroup labels={visibleLabels} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <ViewMorePopover labels={hiddenLabels} totalLabels={labels.length} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
