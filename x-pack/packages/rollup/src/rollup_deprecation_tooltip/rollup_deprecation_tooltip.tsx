/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactElement } from 'react';
import { EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface RollupDeprecationTooltipProps {
  /** The item wrapped by the deprecation tooltip.  */
  children: ReactElement;
}

export const RollupDeprecationTooltip = ({ children }: RollupDeprecationTooltipProps) => {
  return (
    <EuiToolTip
      title={i18n.translate('xpack.rollupJobs.rollupDeprecationTooltipTitle', {
        defaultMessage: 'Rollups are deprecated in 8.11.0',
      })}
      content={i18n.translate('xpack.rollupJobs.rollupDeprecationTooltipContent', {
        defaultMessage:
          'Rollups are deprecated and will be removed in a future version. Use downsampling instead.',
      })}
      children={children}
    />
  );
};
