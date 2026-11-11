/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ADD_CUSTOM_CONTENT_ACTION_ID = 'ADD_CUSTOM_CONTENT_PANEL';

// Kept apart from the attachment schema: the plugin registers the attachment type when it loads, and
// must not pull the schema in with it.
export const CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE = 'platform.custom_content.panel_context';
