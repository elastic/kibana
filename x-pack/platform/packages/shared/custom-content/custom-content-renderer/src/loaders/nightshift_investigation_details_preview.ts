/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Conversation id of the sample in-progress investigation on the Nightshift home. */
export const NIGHTSHIFT_PREVIEW_INVESTIGATION_ID = 'nightshift-investigating-preview';

/** Conversation and investigation documents the sample flyout renders instead of fetching. */
export interface NightshiftInvestigationDetailsPreview {
  conversation: unknown;
  investigation: unknown;
}

let details: NightshiftInvestigationDetailsPreview | undefined;

/** The sample flyout documents, when the investigating preview is showing one. */
export const getNightshiftInvestigationDetailsPreview = ():
  | NightshiftInvestigationDetailsPreview
  | undefined => details;

export const setNightshiftInvestigationDetailsPreview = (
  next: NightshiftInvestigationDetailsPreview | undefined
): void => {
  details = next;
};
