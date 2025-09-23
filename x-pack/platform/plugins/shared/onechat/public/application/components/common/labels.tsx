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
import React, { useState } from 'react';

const LabelGroup: React.FC<{ labels: string[] }> = ({ labels }) => {
  return (
    <EuiBadgeGroup gutterSize="s">
      {labels.map((label) => (
        <EuiBadge key={label} color="hollow">
          {label}
        </EuiBadge>
      ))}
    </EuiBadgeGroup>
  );
};

const ViewMorePopover: React.FC<{ labels: string[] }> = ({ labels }) => {
  const { euiTheme } = useEuiTheme();
  const popoverPanelStyles = css`
    max-inline-size: calc(${euiTheme.size.xxxxl} * 5);
  `;
  const [isOpen, setIsOpen] = useState(false);
  return (
    <EuiPopover
      panelProps={{ css: popoverPanelStyles }}
      isOpen={isOpen}
      closePopover={() => {
        setIsOpen(false);
      }}
      button={
        <EuiButtonEmpty
          size="s"
          onClick={() => {
            setIsOpen((open) => !open);
          }}
        >
          <FormattedMessage
            id="xpack.onechat.labels.viewMore.buttonLabel"
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

export const Labels: React.FC<{ labels: string[]; numVisible?: number }> = ({
  labels,
  numVisible = NUM_VISIBLE_LABELS,
}) => {
  if (labels.length === 0) {
    return null;
  }

  const visibleLabels = labels.slice(0, numVisible);
  const hiddenLabels = labels.slice(numVisible);

  if (hiddenLabels.length === 0) {
    return <LabelGroup labels={visibleLabels} />;
  }

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s">
      <EuiFlexItem grow={false}>
        <LabelGroup labels={visibleLabels} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <ViewMorePopover labels={hiddenLabels} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
