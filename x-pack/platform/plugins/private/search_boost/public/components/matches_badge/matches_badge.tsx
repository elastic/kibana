/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiBadge } from '@elastic/eui';

import type { BoostProfileType, BoostRuleMatch } from '../../../common/types';
import { formatTargetCount } from '../../translations';
import { MatchesPopover } from '../matches_popover/matches_popover';

export interface MatchesBadgeProps {
  type: BoostProfileType;
  matches: readonly BoostRuleMatch[];
  /** Creates an accessible label for the clickable badge, given the count it shows. */
  getOnClickAriaLabel: (appliedCount: number) => string;
  'data-test-subj'?: string;
}

/** Shows a count of matches. If there are any, clicking it opens their list in a popover. */
export const MatchesBadge = ({
  type,
  matches,
  getOnClickAriaLabel,
  'data-test-subj': dataTestSubj,
}: MatchesBadgeProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const appliedCount = matches.filter(({ outrankedByRuleName }) => !outrankedByRuleName).length;
  const countLabel = formatTargetCount(type, appliedCount);

  if (matches.length === 0) {
    return (
      <EuiBadge color="hollow" data-test-subj={dataTestSubj}>
        {countLabel}
      </EuiBadge>
    );
  }

  return (
    <MatchesPopover
      button={
        <EuiBadge
          color="hollow"
          onClick={() => setIsOpen((open) => !open)}
          onClickAriaLabel={getOnClickAriaLabel(appliedCount)}
          data-test-subj={dataTestSubj}
        >
          {countLabel}
        </EuiBadge>
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      type={type}
      matches={matches}
    />
  );
};
