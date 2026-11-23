/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { EuiFlyoutMenuPagination } from '@elastic/eui';
import { FlyoutTemplate } from '@kbn/flyout-template';
import { useAlertDetailsFlyoutWidth } from './use_alert_details_flyout_width';
import * as i18n from './translations';

/**
 * Groups the alert details flyout and anything opened from it into one navigation history.
 */
export const ALERT_DETAILS_FLYOUT_HISTORY_KEY = Symbol('alertingV2EpisodeDetails');

/**
 * A flyout opened on top of the alert details, such as the full runbook. It shares their history
 * group, which gives it the Back button.
 */
export interface AlertDetailsStackedFlyout {
  title: ReactNode;
  description?: ReactNode;
  body: ReactNode;
  'aria-label': string;
  'data-test-subj'?: string;
}

interface AlertDetailsFrameContextValue {
  openStackedFlyout: (flyout: AlertDetailsStackedFlyout) => void;
}

const AlertDetailsFrameContext = createContext<AlertDetailsFrameContextValue | null>(null);

/** Opens flyouts on top of the alert details from content rendered inside `AlertDetailsFrame`. */
export const useAlertDetailsFrame = (): AlertDetailsFrameContextValue => {
  const value = useContext(AlertDetailsFrameContext);
  if (!value) {
    throw new Error('useAlertDetailsFrame must be used inside an AlertDetailsFrame');
  }
  return value;
};

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
  const [stackedFlyout, setStackedFlyout] = useState<AlertDetailsStackedFlyout>();
  const closeStackedFlyout = useCallback(() => setStackedFlyout(undefined), []);
  const contextValue = useMemo(() => ({ openStackedFlyout: setStackedFlyout }), []);

  return (
    <AlertDetailsFrameContext.Provider value={contextValue}>
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
      {/*
       * Rendered outside the frame: the table stays clickable behind it, so a row click can swap
       * the details while it is open. Inside the frame, that swap would unmount it while EUI still
       * has it registered, and EUI would close the whole history group, details included.
       */}
      {stackedFlyout && (
        <FlyoutTemplate
          type="overlay"
          ownFocus={false}
          resizable
          session="start"
          historyKey={ALERT_DETAILS_FLYOUT_HISTORY_KEY}
          size={initialWidth}
          aria-label={stackedFlyout['aria-label']}
          data-test-subj={stackedFlyout['data-test-subj']}
          onClose={closeStackedFlyout}
        >
          <FlyoutTemplate.Header
            title={stackedFlyout.title}
            description={stackedFlyout.description}
          />
          <FlyoutTemplate.Body>{stackedFlyout.body}</FlyoutTemplate.Body>
        </FlyoutTemplate>
      )}
    </AlertDetailsFrameContext.Provider>
  );
};
