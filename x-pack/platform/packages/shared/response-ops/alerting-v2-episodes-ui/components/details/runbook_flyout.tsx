/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FlyoutTemplate } from '@kbn/flyout-template';
import { AlertEpisodeRunbookSection } from './runbook_section';
import { useAlertDetailsFlyoutWidth } from './use_alert_details_flyout_width';
import type { AlertEpisodeDetailsServices } from './types';
import * as i18n from './translations';

export interface AlertEpisodeRunbookFlyoutProps {
  episodeId: string;
  /** Shown under the title. */
  ruleName: string | undefined;
  services: Pick<AlertEpisodeDetailsServices, 'data' | 'http' | 'spaces'>;
  /** The history group of the flyout that opens it, so the user can go back to it. */
  historyKey: symbol;
  onClose: () => void;
}

/** The full runbook of an episode, as its own top-level flyout. */
export const AlertEpisodeRunbookFlyout = ({
  episodeId,
  ruleName,
  services,
  historyKey,
  onClose,
}: AlertEpisodeRunbookFlyoutProps) => {
  const initialWidth = useAlertDetailsFlyoutWidth();

  return (
    <FlyoutTemplate
      type="overlay"
      // Matches the episode flyout: no mask, so both levels of the history group look the same
      ownFocus={false}
      resizable
      session="start"
      historyKey={historyKey}
      size={initialWidth}
      aria-label={i18n.RUNBOOK_FULL_GUIDE_ARIA_LABEL}
      data-test-subj="alertingV2EpisodeRunbookFlyout"
      onClose={onClose}
    >
      <FlyoutTemplate.Header title={i18n.RUNBOOK_TITLE} description={ruleName} />
      <FlyoutTemplate.Body>
        <AlertEpisodeRunbookSection episodeId={episodeId} services={services} />
      </FlyoutTemplate.Body>
    </FlyoutTemplate>
  );
};
