/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Canonical human-readable messages for alert-action domain errors.
 * Used by the alert actions client (runtime Boom errors) and OAS examples so
 * documentation stays aligned with the HTTP responses clients actually see.
 *
 * `message` is not part of the API contract — clients should branch on `code`.
 */

export const getAlertEventNotFoundMessage = (groupHash: string, episodeId?: string): string =>
  `Alert event with group_hash [${groupHash}] and episode_id [${episodeId}] not found`;

export const getCannotActivateEpisodeMessage = (episodeId: string): string =>
  `Cannot activate episode [${episodeId}]. It is already active`;

export const getCannotDeactivateEpisodeMessage = (episodeId: string): string =>
  `Cannot deactivate episode [${episodeId}]. It is already inactive`;
