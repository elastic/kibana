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
import React, { forwardRef, useEffect, useRef, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

const LabelGroup = forwardRef<HTMLDivElement, { labels: string[]; className?: string }>(
  ({ labels, className }, ref) => {
    return (
      <EuiBadgeGroup className={className} gutterSize="s" ref={ref}>
        {labels.map((label) => (
          <EuiBadge key={label} color="hollow">
            {label}
          </EuiBadge>
        ))}
      </EuiBadgeGroup>
    );
  }
);

export const Labels: React.FC<{ labels: string[] }> = ({ labels }) => {
  const [isViewAllPopoverOpen, setIsViewAllPopoverOpen] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const { euiTheme } = useEuiTheme();
  const viewAllLabelsContainerStyles = css`
    max-inline-size: calc(${euiTheme.size.xxxxl} * 5);
  `;
  const truncatedContainerHeight = euiTheme.size.l;
  const truncatedStyles = css`
    max-block-size: ${truncatedContainerHeight};
    overflow: hidden;
  `;
  const labelsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (labelsContainerRef.current) {
      const isContentTruncated =
        labelsContainerRef.current.scrollHeight > labelsContainerRef.current.clientHeight;
      setIsTruncated(isContentTruncated);
    }
  }, [labels]);

  if (labels.length === 0) {
    return null;
  }
  if (!isTruncated) {
    return <LabelGroup labels={labels} css={truncatedStyles} ref={labelsContainerRef} />;
  }
  return (
    <EuiFlexGroup alignItems="center" gutterSize="s">
      <EuiFlexItem grow={false}>
        <LabelGroup labels={labels} css={truncatedStyles} ref={labelsContainerRef} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiPopover
          panelProps={{ css: viewAllLabelsContainerStyles }}
          isOpen={isViewAllPopoverOpen}
          closePopover={() => {
            setIsViewAllPopoverOpen(false);
          }}
          button={
            <EuiButtonEmpty
              size="s"
              onClick={() => {
                setIsViewAllPopoverOpen((open) => !open);
              }}
            >
              <FormattedMessage
                id="xpack.onechat.labels.viewAll.buttonLabel"
                defaultMessage="View all ({numLabels})"
                values={{ numLabels: labels.length }}
              />
            </EuiButtonEmpty>
          }
        >
          <LabelGroup labels={labels} />
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
