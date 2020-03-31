/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsUpdateResponse } from 'kibana/server';
import { IRuleActionsAttributesSavedObjectAttributes } from './types';

export const getThrottleOptions = (throttle = 'no_actions') => ({
  ruleThrottle: throttle,
  alertThrottle: ['no_actions', 'rule'].includes(throttle) ? null : throttle,
});

export const getRuleActionsFromSavedObject = (
  savedObject: SavedObjectsUpdateResponse<IRuleActionsAttributesSavedObjectAttributes>
) => ({
  id: savedObject.id,
  actions: savedObject.attributes.actions || [],
  alertThrottle: savedObject.attributes.alertThrottle || null,
  ruleThrottle: savedObject.attributes.ruleThrottle || 'no_actions',
});
