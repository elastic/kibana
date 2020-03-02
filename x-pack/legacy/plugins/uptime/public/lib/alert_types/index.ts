/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertTypeModel } from '../../../../../../plugins/triggers_actions_ui/public/types';

type AlertTypeInitializer = (autocomplete: any) => () => AlertTypeModel;

import { initMonitorStatusAlertType } from './monitor_status';
export const alertTypeInitializers: AlertTypeInitializer[] = [initMonitorStatusAlertType];
