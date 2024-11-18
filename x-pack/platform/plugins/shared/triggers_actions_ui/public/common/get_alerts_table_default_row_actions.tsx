/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { DefaultAlertActions } from '../application/sections/alerts_table/row_actions';
import type { AlertActionsProps } from '../types';

export const getAlertsTableDefaultAlertActionsLazy = (props: AlertActionsProps) => {
  return <DefaultAlertActions {...props} />;
};
