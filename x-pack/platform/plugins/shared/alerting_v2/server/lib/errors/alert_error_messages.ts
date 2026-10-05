/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getAlertSeriesNotFoundMessage = (groupHash: string): string =>
  `Alert series with group_hash [${groupHash}] not found`;

export const getAlertEpisodeNotFoundMessage = (episodeId: string): string =>
  `Alert with alert_id [${episodeId}] not found`;

export const getEpisodeNotLatestMessage = (episodeId: string, groupHash: string): string =>
  `Alert [${episodeId}] is not the latest alert for group [${groupHash}]`;

export const getCannotActivateEpisodeMessage = (episodeId: string): string =>
  `Cannot activate alert [${episodeId}]. It is already active`;

export const getCannotDeactivateEpisodeMessage = (episodeId: string): string =>
  `Cannot deactivate alert [${episodeId}]. It is already inactive`;

export const getAlertAlreadyAcknowledgedMessage = (episodeId: string): string =>
  `Cannot acknowledge alert [${episodeId}]. It is already acknowledged`;

export const getAlertNotAcknowledgedMessage = (episodeId: string): string =>
  `Cannot remove the acknowledgement from alert [${episodeId}]. It is not acknowledged`;

export const getAssigneeUnchangedMessage = (
  episodeId: string,
  assigneeUid: string | null
): string =>
  assigneeUid == null
    ? `Cannot unassign alert [${episodeId}]. It has no assignee`
    : `Cannot assign alert [${episodeId}]. It is already assigned to [${assigneeUid}]`;

export const getTagsUnchangedMessage = (episodeId: string): string =>
  `Cannot tag alert [${episodeId}]. It already carries the requested tags`;
