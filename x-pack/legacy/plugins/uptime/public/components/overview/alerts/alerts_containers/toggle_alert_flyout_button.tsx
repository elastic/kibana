/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useDispatch } from 'react-redux';
import { setAlertFlyoutVisible } from '../../../../state/actions';
import { ToggleAlertFlyoutButtonComponent } from '../index';

export const ToggleAlertFlyoutButton = () => {
  const dispatch = useDispatch();
  return (
    <ToggleAlertFlyoutButtonComponent
      setAlertFlyoutVisible={(value: boolean) => dispatch(setAlertFlyoutVisible(value))}
    />
  );
};
