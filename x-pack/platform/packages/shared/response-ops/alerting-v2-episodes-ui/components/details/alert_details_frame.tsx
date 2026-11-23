/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactNode } from 'react';
import type { EuiFlyoutMenuPagination } from '@elastic/eui';
import { FlyoutTemplate } from '@kbn/flyout-template';
import { useAlertDetailsFlyoutWidth } from './use_alert_details_flyout_width';
import * as i18n from './translations';

/**
 * Groups the alert details flyout and anything opened from it into one navigation history.
 */
export const ALERT_DETAILS_FLYOUT_HISTORY_KEY = Symbol('alertingV2EpisodeDetails');

export interface AlertDetailsFrameProps {
  onClose: () => void;
  pagination?: EuiFlyoutMenuPagination;
  'data-test-subj'?: string;
  children: ReactNode;
}

/**
 * The flyout shell shared by the Universal and Classic alert details. It stays mounted while the
 * details declared inside it change, so moving between alerts of either kind keeps one flyout open.
 */
export const AlertDetailsFrame = ({
  onClose,
  pagination,
  'data-test-subj': dataTestSubj,
  children,
}: AlertDetailsFrameProps) => {
  const initialWidth = useAlertDetailsFlyoutWidth();

  return (
    <FlyoutTemplate.Frame
      type="overlay"
      ownFocus={false}
      resizable
      session="start"
      historyKey={ALERT_DETAILS_FLYOUT_HISTORY_KEY}
      flyoutMenuProps={{ title: i18n.FLYOUT_ARIA_LABEL, pagination }}
      size={initialWidth}
      aria-label={i18n.FLYOUT_ARIA_LABEL}
      data-test-subj={dataTestSubj}
      onClose={onClose}
    >
      {children}
    </FlyoutTemplate.Frame>
  );
};
