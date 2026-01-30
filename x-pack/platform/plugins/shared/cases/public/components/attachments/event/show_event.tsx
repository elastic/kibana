/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { EuiToolTip, EuiButtonIcon } from '@elastic/eui';
import * as i18n from '../../user_actions/translations';
import { useCaseViewNavigation, useCaseViewParams } from '../../../common/navigation';
import { CASE_VIEW_PAGE_TABS } from '../../../../common/types';

interface UserActionShowEventProps {
  id: string;
  eventId: string;
  index: string;
  onShowEventDetails?: (alertId: string, index: string) => void;
}

const UserActionShowEventComponent = ({
  id,
  eventId,
  index,
  onShowEventDetails,
}: UserActionShowEventProps) => {
  const { navigateToCaseView } = useCaseViewNavigation();
  const { detailName } = useCaseViewParams();

  const onClick = useCallback(() => {
    if (onShowEventDetails) {
      onShowEventDetails(eventId, index);
    } else {
      navigateToCaseView({ detailName, tabId: CASE_VIEW_PAGE_TABS.EVENTS });
    }
  }, [eventId, detailName, index, navigateToCaseView, onShowEventDetails]);

  return (
    <EuiToolTip position="top" content={<p>{i18n.SHOW_EVENT_TOOLTIP}</p>}>
      <EuiButtonIcon
        aria-label={i18n.SHOW_EVENT_TOOLTIP}
        data-test-subj={`comment-action-show-event-${id}`}
        onClick={onClick}
        iconType="arrowRight"
        id={`${id}-show-event`}
      />
    </EuiToolTip>
  );
};
UserActionShowEventComponent.displayName = 'UserActionShowEvent';

export const UserActionShowEvent = memo(UserActionShowEventComponent);
