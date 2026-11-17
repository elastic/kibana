/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiLink, EuiTextColor } from '@elastic/eui';
import type { BoostProfileType, BoostRuleMatch } from '../../../common/types';
import { formatTargetCount } from '../../translations';
import { MatchesPopover } from '../matches_popover/matches_popover';

interface AppliesToProps {
  type: BoostProfileType;
  appliedCount: number;
  matches: BoostRuleMatch[];
}

export const AppliesTo = ({ type, appliedCount, matches }: AppliesToProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const label = formatTargetCount(type, appliedCount);

  if (matches.length === 0) {
    return (
      <EuiTextColor color="subdued" data-test-subj="searchBoostRuleNoMatches">
        {label}
      </EuiTextColor>
    );
  }

  return (
    <MatchesPopover
      button={
        <EuiLink onClick={() => setIsOpen((open) => !open)} data-test-subj="searchBoostRuleMatches">
          {label}
        </EuiLink>
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      type={type}
      matches={matches}
    />
  );
};
