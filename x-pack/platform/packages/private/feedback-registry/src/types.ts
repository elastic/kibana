/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeedbackRegistryEntry } from '@kbn/feedback-components';

/**
 * The id of the application associated with this feedback entry, e.g. 'dashboard', 'discover'
 * or in case of deep links, the deep link id e.g. 'ml:dataVisualizer'.
 */
export type FeedbackRegistryEntryId = string;

/**
 * List of feedback plugin questions for a given application.
 */
export type FeedbackRegistry = Map<FeedbackRegistryEntryId, FeedbackRegistryEntry[]>;
