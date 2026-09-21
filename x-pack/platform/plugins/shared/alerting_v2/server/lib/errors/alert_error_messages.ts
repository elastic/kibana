/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getAlertSeriesNotFoundMessage = (groupHash: string): string =>
  `Alert series with group_hash [${groupHash}] not found`;

export const getAlertEpisodeNotFoundMessage = (alertId: string): string =>
  `Alert with alert_id [${alertId}] not found`;

export const getEpisodeNotLatestMessage = (alertId: string, groupHash: string): string =>
  `Alert [${alertId}] is not the latest alert for group [${groupHash}]`;

export const getCannotActivateEpisodeMessage = (alertId: string): string =>
  `Cannot activate alert [${alertId}]. It is already active`;

export const getCannotDeactivateEpisodeMessage = (alertId: string): string =>
  `Cannot deactivate alert [${alertId}]. It is already inactive`;
