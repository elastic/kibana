/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Represents a dashboard from a content pack that matches a stream
 */
export interface ContentPackDashboard {
  /** Dashboard saved object ID */
  id: string;
  /** Dashboard title */
  title: string;
  /** Name of the content package that provides this dashboard */
  packageName: string;
  /** Title of the content package */
  packageTitle: string;
  /** Version of the content package */
  packageVersion: string;
}

/**
 * Result of matching content packs to a stream
 */
export interface ContentPackSuggestion {
  /** The stream name this suggestion is for */
  streamName: string;
  /** The dataset extracted from the stream name */
  dataset: string;
  /** Matched dashboards from content packs */
  dashboards: ContentPackDashboard[];
}
