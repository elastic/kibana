/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SummaryKind } from './constants';

/** What a connector is set to learn from agents' reads. */
export interface LearnSettings {
  learn: 'off' | 'reads';
  /** `direct`: the file read. `siblings`: also its folder. `area`: also the levels below that folder. */
  reach: 'direct' | 'siblings' | 'area';
  area: { maxFiles: number; maxDepth: number };
  /** Write a model summary of each file read; off remembers only its name and kind. */
  summarizeReads: boolean;
}

/** A scheduled crawl: where it starts, how far it goes, what it writes and how often. */
export interface CrawlSettings {
  /** Where it starts, as the connector names it (see `ContentSourceHint`); absent is the top. */
  folder?: string;
  maxDepth: number;
  maxFiles: number;
  /** `names` writes from the listing alone, for any file; `full` reads text files and summarizes them. */
  mode: 'names' | 'full';
  /** The model for `full`; absent follows the server's. */
  inferenceConnectorId?: string;
  intervalMinutes: number;
}

export interface CrawlScheduleStatus {
  status: string;
  crawl?: CrawlSettings;
  lastRun?: { at: string; status: string; durationMs?: number };
}

/** What an admin may set for a connector (the settings call's body); anything left out keeps its default. */
export interface ConnectorSettingsBody extends Partial<Omit<LearnSettings, 'area'>> {
  area?: Partial<LearnSettings['area']>;
  /** An object sets the scheduled crawl, `null` removes it, and leaving it out keeps it as it is. */
  crawl?: CrawlSettings | null;
}

export interface ConnectorListEntry {
  connectorId: string;
  name: string;
  connectorType: string;
  permissionScope: 'connector' | 'per_user';
  settings: LearnSettings;
  /** True when an admin saved settings for this connector. */
  customized: boolean;
  documents: number;
  schedule: CrawlScheduleStatus | null;
}

/** What a connector's spec says about the starting location of a crawl. */
export interface ContentSourceHint {
  example: string;
  required: boolean;
}

export interface ConnectorStatus {
  connectorId: string;
  connectorType: string;
  permissionScope: 'connector' | 'per_user';
  settings: { effective: LearnSettings; customized: boolean };
  /** Cached documents the caller can see, and all of them, by `summary_kind`. */
  documents: { visibleToYou: number; total: number; byKind: Partial<Record<SummaryKind, number>> };
  newestAt: string | null;
  /** False when scheduled crawls are not available here, so there is nothing to offer. */
  crawlEnabled: boolean;
  /** Absent when the connector cannot be crawled. */
  contentSource?: ContentSourceHint;
  schedule: CrawlScheduleStatus | null;
}
