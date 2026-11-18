/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shortHash, slugify } from '../dreaming/ids';

/**
 * The KI id of a dataset. Always hash-suffixed: `logs-a.b` and `logs-a-b` are different datasets
 * with the same slug.
 */
export const datasetKiId = (name: string): string =>
  `ontology-dataset--${slugify(name)}-${shortHash(name).slice(0, 8)}`;

/** The KI id of a term: names that differ only in case or punctuation are the same term. */
export const termKiId = (name: string): string => `ontology-term--${slugify(name)}`;

/** A stable id for an ES|QL source, from its query: reordering the sources keeps it. */
export const esqlSourceId = (query: string): string => shortHash(query.trim());

const ESQL_SOURCE_URI_PREFIX = 'esql-source://';

/** The URI an ontology KI cites the ES|QL source it was discovered from by. */
export const esqlSourceUri = (sourceId: string): string => `${ESQL_SOURCE_URI_PREFIX}${sourceId}`;
