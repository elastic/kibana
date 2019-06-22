/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/** A data provider rendered in the timeline's data providers drop area */
export const DATA_PROVIDER = '[data-test-subj="providerContainer"]';

/** Data providers are dropped and rendered in this area of the timeline */
export const TIMELINE_DATA_PROVIDERS = '[data-test-subj="dataProviders"]';

/** Data providers that were dropped on a timeline */
export const TIMELINE_DROPPED_DATA_PROVIDERS = `${TIMELINE_DATA_PROVIDERS} ${DATA_PROVIDER}`;

/** The `T I M E L I N E` button that toggles visibility of the Timeline */
export const TIMELINE_TOGGLE_BUTTON = '[data-test-subj="flyoutOverlay"]';
