/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OpenConversationSidebarOptions } from '@kbn/agent-builder-browser';

export type { OpenConversationSidebarOptions };

/**
 * Restoring a conversation by id is part of the public sidebar options; this alias remains so
 * internal callers keep a name of their own if the two ever diverge again.
 */
export type OpenSidebarInternalOptions = OpenConversationSidebarOptions;
