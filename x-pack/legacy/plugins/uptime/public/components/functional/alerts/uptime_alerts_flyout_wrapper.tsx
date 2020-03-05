/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { AlertAdd } from '../../../../../../../plugins/triggers_actions_ui/public';
import { selectAlertFlyoutVisibility } from '../../../state/selectors';
import { setAlertFlyoutVisible } from '../../../state/actions';

interface Props {
  alertTypeId?: string;
  canChangeTrigger?: boolean;
}

export const UptimeAlertsFlyoutWrapper = ({ alertTypeId, canChangeTrigger }: Props) => {
  const alertFlyoutVisible = useSelector(selectAlertFlyoutVisibility);
  const dispatch = useDispatch();
  const setAddFlyoutVisiblity = (value: React.SetStateAction<boolean>) =>
    // @ts-ignore the value here is a boolean, and it works with the action creator function
    dispatch(setAlertFlyoutVisible(value));
  return (
    <AlertAdd
      addFlyoutVisible={alertFlyoutVisible}
      consumer="uptime"
      setAddFlyoutVisibility={setAddFlyoutVisiblity}
      alertTypeId={alertTypeId}
      canChangeTrigger={canChangeTrigger}
    />
  );
};
