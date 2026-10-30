/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import type { ESQLControlVariable } from '@kbn/esql-types';
import type { PanelContentAttempt } from './resolve_panel';

/**
 * Turns a visualization attachment id into panel content. Injected like the other resolvers so
 * dashboard authoring stays free of store access. Synchronous because the attachment state is in memory.
 */
export type ResolveAttachmentPanel = (attachmentId: string) => PanelContentAttempt;

/** Whether a mapped field can back a `STATS BY` across the whole index, and why not. */
export type ControlFieldCapability =
  | { status: 'usable'; type: string }
  | { status: 'conflicting' }
  | { status: 'not_aggregatable' };

/** Field capabilities keyed by name. Fields not mapped on the index are absent. */
export type ControlFieldCapabilities = Map<string, ControlFieldCapability>;

/**
 * Loads the capabilities of the given fields on an index. Injected like the other resolvers so
 * dashboard authoring stays free of Elasticsearch access.
 */
export type ResolveControlFieldCapabilities = (params: {
  index: string;
  fieldNames: readonly string[];
  projectRouting?: string;
}) => Promise<ControlFieldCapabilities>;

/**
 * Loads the type of the one column a query-based ES|QL control's query returns, or undefined when it
 * cannot be told. Injected like the other resolvers so dashboard authoring stays free of Elasticsearch access.
 */
export type ResolveEsqlControlColumnType = (params: {
  query: string;
  esqlVariables: ESQLControlVariable[];
  /** The dashboard's time range, which binds `?_tstart` and `?_tend` in the query. */
  timeRange?: DashboardAttachmentData['time_range'];
}) => Promise<string | undefined>;
