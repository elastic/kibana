/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiStat, EuiToolTip } from '@elastic/eui';
import React, { useMemo } from 'react';

import { TITLE_SIZE } from '../constants';
import * as i18n from './translations';

interface Props {
  total: number;
}

const AvailableStatComponent: React.FC<Props> = ({ total }) => {
  const tooltipContent = useMemo(() => i18n.AVAILABLE_TOOLTIP(total), [total]);

  return (
    <EuiToolTip content={tooltipContent}>
      <EuiStat
        data-test-subj="availableStat"
        description={i18n.AVAILABLE}
        reverse
        title={total}
        titleSize={TITLE_SIZE}
      />
    </EuiToolTip>
  );
};

AvailableStatComponent.displayName = 'AvailableStatComponent';

export const AvailableStat = React.memo(AvailableStatComponent);
