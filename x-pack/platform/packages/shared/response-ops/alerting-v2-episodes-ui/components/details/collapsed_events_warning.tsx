/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIconTip } from '@elastic/eui';
import * as i18n from './translations';

export interface AlertEpisodeCollapsedEventsWarningProps {
  eventLimit: number;
}

/** Warning icon whose tooltip explains that status and severity changes are collapsed. */
export const AlertEpisodeCollapsedEventsWarning = ({
  eventLimit,
}: AlertEpisodeCollapsedEventsWarningProps) => (
  <EuiIconTip
    type="warning"
    color="warning"
    content={i18n.getAlertTimelineCollapsedWarning(eventLimit)}
    aria-label={i18n.ALERT_TIMELINE_COLLAPSED_WARNING_ARIA_LABEL}
    iconProps={{ 'data-test-subj': 'alertingV2EpisodeCollapsedEventsWarning' }}
  />
);
