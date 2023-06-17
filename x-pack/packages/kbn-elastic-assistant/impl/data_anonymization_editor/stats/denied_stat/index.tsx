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
  denied: number;
  total: number;
}

const DeniedStatComponent: React.FC<Props> = ({ denied, total }) => {
  const tooltipContent = useMemo(() => i18n.DENIED_TOOLTIP({ denied, total }), [denied, total]);

  return (
    <EuiToolTip content={tooltipContent}>
      <EuiStat
        data-test-subj="deniedStat"
        description={i18n.DENIED}
        reverse
        title={denied}
        titleSize={TITLE_SIZE}
      />
    </EuiToolTip>
  );
};

DeniedStatComponent.displayName = 'DeniedStatComponent';

export const DeniedStat = React.memo(DeniedStatComponent);
