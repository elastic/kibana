/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiIcon } from '@elastic/eui';
import { dlmPhasesSelectorStrings as strings } from '../strings';
import { PhaseCard } from './phase_card';

export interface HotPhaseCardProps {
  id: string;
  color: string;
}

export const HotPhaseCard = ({ id, color }: HotPhaseCardProps) => {
  return (
    <PhaseCard
      id={id}
      checked
      dataTestSubj="dlmPhasesSelectorHotPhaseCard"
      disabled
      checkboxAriaLabel={strings.hotPhaseCheckboxAriaLabel}
      title={strings.hotPhaseLabel}
      description={strings.hotPhaseDescription}
      icon={<EuiIcon type="dot" color={color} size="m" aria-hidden />}
      badges={<EuiBadge>{strings.requiredBadgeLabel}</EuiBadge>}
    />
  );
};
