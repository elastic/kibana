/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import { AlertSummaryWidgetLoader } from '../application/sections/alert_summary_widget/components';
import { AlertSummaryWidgetProps } from '../application/sections/alert_summary_widget';
import { AlertSummaryWidgetDependencies } from '../application/sections/alert_summary_widget/types';

const AlertSummaryWidgetLazy: React.FC<AlertSummaryWidgetProps & AlertSummaryWidgetDependencies> =
  lazy(() => import('../application/sections/alert_summary_widget/alert_summary_widget'));

export const getAlertSummaryWidgetLazy = (
  props: AlertSummaryWidgetProps & AlertSummaryWidgetDependencies
) => {
  return (
    <Suspense
      fallback={
        <AlertSummaryWidgetLoader
          fullSize={props.fullSize}
          isLoadingWithoutChart={props.hideChart}
        />
      }
    >
      <AlertSummaryWidgetLazy {...props} />
    </Suspense>
  );
};
