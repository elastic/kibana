/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useSelector, useDispatch } from 'react-redux';
import React from 'react';
import { EuiGlobalToastList } from '@elastic/eui';
import { Toast } from 'kibana/public';
import { dismissToastById } from '../state/actions/toasts';

export const UptimeToasts: React.FC = () => {
  const toasts = useSelector<any, Toast[]>(state => state.toasts);
  const dispatch = useDispatch();

  const removeToast = (removedToast: { id: string }) => {
    dispatch(dismissToastById(removedToast.id));
  };

  return <EuiGlobalToastList toasts={toasts} dismissToast={removeToast} toastLifeTimeMs={6000} />;
};
