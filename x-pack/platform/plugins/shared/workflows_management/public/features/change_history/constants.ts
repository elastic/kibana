/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Synthetic timeline id for the in-editor unsaved row.
 * Must remain stable across sessions and must not collide with persisted
 * change-history `event.id` values from Elasticsearch.
 */
export const WORKFLOW_UNSAVED_CHANGE_ID = '__workflow_unsaved__';
