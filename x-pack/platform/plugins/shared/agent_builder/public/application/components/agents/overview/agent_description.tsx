/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useLayoutEffect, useRef, useState } from 'react';
import { labels } from '../../../utils/i18n';

const { agentOverview: overviewLabels } = labels;

const descriptionContainerStyles = css`
  max-inline-size: 800px;
`;
const collapsedStyles = css`
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;
const expandedStyles = css`
  max-height: 500px;
  overflow-y: auto;
`;

export const AgentDescription = ({ description }: { description: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const descriptionRef = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const el = descriptionRef.current;
    if (el && !isExpanded) {
      setIsOverflowing(el.scrollHeight > el.clientHeight);
    }
  }, [description, isExpanded]);

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="none"
      css={descriptionContainerStyles}
      alignItems="flexStart"
    >
      <EuiFlexItem grow={false}>
        <EuiText size="m" color="default">
          <p ref={descriptionRef} css={isExpanded ? expandedStyles : collapsedStyles}>
            {description}
          </p>
        </EuiText>
      </EuiFlexItem>

      {isOverflowing && (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            flush="left"
            iconType={isExpanded ? 'arrowUp' : 'arrowDown'}
            iconSide="right"
            onClick={() => {
              setIsExpanded((prev) => !prev);
            }}
            data-test-subj="agentOverviewDescriptionToggle"
          >
            {isExpanded ? overviewLabels.readLess : overviewLabels.readMore}
          </EuiButtonEmpty>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
