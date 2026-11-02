/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIconTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface StaleStatsIconProps {
  dataTestSubj: string;
}

/**
 * Marks numbers that could not be refreshed. The last values stay on screen, so without this mark
 * a failed poll would leave them looking current.
 */
export const StaleStatsIcon = ({ dataTestSubj }: StaleStatsIconProps) => (
  <EuiIconTip
    type="warning"
    color="warning"
    size="s"
    anchorProps={{ 'data-test-subj': dataTestSubj }}
    content={i18n.translate('xpack.streams.canvas.staleStatsTooltip', {
      defaultMessage: 'Could not refresh. Showing the last known values.',
    })}
  />
);
