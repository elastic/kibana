/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useDispatch } from 'react-redux';
import { ToggleAlertFlyoutButtonComponent } from '../../functional';
import { setAlertFlyoutVisible } from '../../../state/actions';

export const ToggleAlertFlyoutButton = () => {
  const dispatch = useDispatch();
  return (
    <ToggleAlertFlyoutButtonComponent
      setAlertFlyoutVisible={(value: boolean) => dispatch(setAlertFlyoutVisible(value))}
    />
  );
};
