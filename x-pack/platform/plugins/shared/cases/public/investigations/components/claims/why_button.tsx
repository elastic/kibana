/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import type { ArgumentStrength } from '../../../../common/investigations/types';
import { ICONS } from '../../icons';
import { STRENGTH_COLORS, STRENGTH_LABELS } from './claim_utils';
import * as i18n from './translations';

export interface WhyButtonProps {
  strength: ArgumentStrength;
  evidenceCount: number;
  /** What the argument is about, for the accessible name: "claim", "verdict", "proposal". */
  subject: string;
  onClick: () => void;
  'data-test-subj'?: string;
}

/** Opens the evidence and reasoning behind a verdict, claim or proposal. */
export const WhyButton: React.FC<WhyButtonProps> = ({
  strength,
  evidenceCount,
  subject,
  onClick,
  'data-test-subj': dataTestSubj = 'investigationWhyButton',
}) => (
  <EuiBadge
    color={STRENGTH_COLORS[strength]}
    iconType={ICONS.chevronRight}
    iconSide="right"
    onClick={onClick}
    onClickAriaLabel={i18n.WHY_ARIA(subject)}
    data-test-subj={dataTestSubj}
  >
    {i18n.WHY_LABEL(STRENGTH_LABELS[strength], evidenceCount)}
  </EuiBadge>
);
WhyButton.displayName = 'WhyButton';
