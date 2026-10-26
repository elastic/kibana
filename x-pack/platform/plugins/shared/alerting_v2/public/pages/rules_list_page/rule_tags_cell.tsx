/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiBadgeGroup, EuiToolTip } from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

const labelsContainerStyle = css`
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  overflow: hidden;
`;

const labelBadgeStyle = css`
  min-width: 0;
  flex-shrink: 1;
`;

const overflowTooltipStyle = css`
  flex-shrink: 0;
  line-height: 0;
`;

const VISIBLE_TAGS_COUNT = 2;

interface RuleTagsCellProps {
  tags?: string[];
  containerTestSubj: string;
  overflowTestSubj: string;
}

export const RuleTagsCell: React.FC<RuleTagsCellProps> = ({
  tags,
  containerTestSubj,
  overflowTestSubj,
}) => {
  if (!tags || tags.length === 0) {
    return <FormattedMessage id="xpack.alertingV2.rulesList.emptyValue" defaultMessage="-" />;
  }
  const visibleTags = tags.slice(0, VISIBLE_TAGS_COUNT);
  const overflowTags = tags.slice(VISIBLE_TAGS_COUNT);
  return (
    <EuiBadgeGroup gutterSize="xs" css={labelsContainerStyle} data-test-subj={containerTestSubj}>
      {visibleTags.map((tag) => (
        <EuiBadge
          key={tag}
          color="hollow"
          css={overflowTags.length > 0 ? labelBadgeStyle : undefined}
        >
          {tag}
        </EuiBadge>
      ))}
      {overflowTags.length > 0 && (
        <span css={overflowTooltipStyle}>
          <EuiToolTip content={overflowTags.join(', ')}>
            <EuiBadge
              tabIndex={0}
              color="hollow"
              data-test-subj={overflowTestSubj}
              iconType="tag"
              title=""
            >
              {i18n.translate('xpack.alertingV2.rulesList.tags.overflow', {
                defaultMessage: '+{count}',
                values: { count: overflowTags.length },
              })}
            </EuiBadge>
          </EuiToolTip>
        </span>
      )}
    </EuiBadgeGroup>
  );
};
