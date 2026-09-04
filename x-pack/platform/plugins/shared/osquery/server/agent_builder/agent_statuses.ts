/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Agent statuses that can actually execute a live query. Fleet's `showInactive:
 * false` only excludes `inactive`; `uninstalled`/`orphaned`/`deprecated`
 * enrolments survive it while being unable to run anything. Kept in its own
 * module so tools and availability gates can share it without import cycles.
 */
export const EXECUTABLE_AGENT_STATUSES = new Set(['online', 'offline', 'enrolling', 'updating']);
