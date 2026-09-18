/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup } from '@elastic/eui';
import { LocationStatusRow, type LocationStatusItem } from './location_status_row';

export type { LocationStatusItem };

export interface LocationStatusListProps {
  items: LocationStatusItem[];
  ariaLabel: string;
  'data-test-subj': string;
  onIconTestSubj: string;
  offIconTestSubj: string;
  onAriaLabel: string;
  offAriaLabel: string;
}

export const LocationStatusList: React.FC<LocationStatusListProps> = ({
  items,
  ariaLabel,
  'data-test-subj': testSubj,
  onIconTestSubj,
  offIconTestSubj,
  onAriaLabel,
  offAriaLabel,
}) => (
  <EuiFlexGroup
    direction="column"
    gutterSize="s"
    role="group"
    aria-label={ariaLabel}
    data-test-subj={testSubj}
  >
    {items.map((item) => (
      <LocationStatusRow
        key={item.key}
        item={item}
        onIconTestSubj={onIconTestSubj}
        offIconTestSubj={offIconTestSubj}
        onAriaLabel={onAriaLabel}
        offAriaLabel={offAriaLabel}
      />
    ))}
  </EuiFlexGroup>
);
