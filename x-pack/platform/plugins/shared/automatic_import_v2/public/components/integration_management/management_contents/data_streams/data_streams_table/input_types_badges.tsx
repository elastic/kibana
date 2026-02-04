/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiBadgeGroup, EuiToolTip, useEuiTheme } from '@elastic/eui';
import type { DataStreamResponse } from '../../../../../../common';

interface InputTypesBadgesProps {
  inputTypes: DataStreamResponse['inputTypes'];
}

export const InputTypesBadges = ({ inputTypes }: InputTypesBadgesProps) => {
  const { euiTheme } = useEuiTheme();

  const tooltipStyles = {
    backgroundColor: euiTheme.colors.backgroundBaseSubdued,
    color: euiTheme.colors.textParagraph,
    border: 'none',
  };

  if (inputTypes == null || inputTypes.length === 0) {
    return null;
  }

  const firstBadge = inputTypes[0];
  const additionalBadgesNumber = inputTypes.length - 1;

  const allRemainingBadges = inputTypes.slice(1).map((inputType) => (
    <EuiBadge key={inputType.name} color="hollow" css={{ borderRadius: '4px' }}>
      {inputType.name}
    </EuiBadge>
  ));

  return (
    <EuiBadgeGroup data-test-subj="input-types-table-column-tags" gutterSize="xs">
      <EuiBadge key={firstBadge.name} color="hollow" css={{ borderRadius: '4px' }}>
        {firstBadge.name}
      </EuiBadge>
      {additionalBadgesNumber > 0 && (
        <EuiToolTip
          css={tooltipStyles}
          content={allRemainingBadges}
          anchorProps={{ style: { display: 'flex' } }}
        >
          <EuiBadge color="hollow" css={{ borderRadius: '4px' }} tabIndex={0}>
            +{additionalBadgesNumber}
          </EuiBadge>
        </EuiToolTip>
      )}
    </EuiBadgeGroup>
  );
};

InputTypesBadges.displayName = 'InputTypesBadges';
