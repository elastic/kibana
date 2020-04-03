/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { getAdvancedSettings } from '../../../../public/lib/kibana_advanced_settings';
import { TimeFilter as Component, Props } from './time_filter';

export const TimeFilter = (props: Props) => {
  const customQuickRanges = (getAdvancedSettings().get('timepicker:quickRanges') || []).map(
    ({ from, to, display }: { from: string; to: string; display: string }) => ({
      start: from,
      end: to,
      label: display,
    })
  );

  const customDateFormat = getAdvancedSettings().get('dateFormat');

  return (
    <Component {...props} commonlyUsedRanges={customQuickRanges} dateFormat={customDateFormat} />
  );
};
