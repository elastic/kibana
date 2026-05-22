/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_API_PATH, RULE_API_PATH } from './constants';

/**
 * URL for a single rule resource: `${RULE_API_PATH}/${encodedId}`.
 *
 * Always pass through `encodeURIComponent` so callers cannot accidentally
 * leak unencoded characters into path segments — important for the validation
 * tests that craft pathological ids.
 */
export const getRuleUrl = (id: string) => `${RULE_API_PATH}/${encodeURIComponent(id)}`;

const getAlertActionUrl = (groupHash: string, suffix: string) =>
  `${ALERT_API_PATH}/${encodeURIComponent(groupHash)}/${suffix}`;

export const getAckAlertActionUrl = (groupHash: string) => getAlertActionUrl(groupHash, '_ack');
export const getUnackAlertActionUrl = (groupHash: string) => getAlertActionUrl(groupHash, '_unack');
export const getAssignAlertActionUrl = (groupHash: string) =>
  getAlertActionUrl(groupHash, '_assign');
export const getTagAlertActionUrl = (groupHash: string) => getAlertActionUrl(groupHash, '_tag');
export const getSnoozeAlertActionUrl = (groupHash: string) =>
  getAlertActionUrl(groupHash, '_snooze');
export const getUnsnoozeAlertActionUrl = (groupHash: string) =>
  getAlertActionUrl(groupHash, '_unsnooze');
export const getActivateAlertActionUrl = (groupHash: string) =>
  getAlertActionUrl(groupHash, '_activate');
export const getDeactivateAlertActionUrl = (groupHash: string) =>
  getAlertActionUrl(groupHash, '_deactivate');

export const BULK_ALERT_ACTION_URL = `${ALERT_API_PATH}/_bulk_action`;
