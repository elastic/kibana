/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AiIndexSource } from '../../common/http_api/ai_indices';
import { SOURCE_URI_PREFIX } from '../../common/ontology';
import { shortHash, slugify } from '../dreaming/ids';

/**
 * The KI id of a dataset. Always hash-suffixed: `logs-a.b` and `logs-a-b` are different datasets
 * with the same slug.
 */
export const datasetKiId = (name: string): string =>
  `ontology-dataset--${slugify(name)}-${shortHash(name).slice(0, 8)}`;

/** The KI id of a term: names that differ only in case or punctuation are the same term. */
export const termKiId = (name: string): string => `ontology-term--${slugify(name)}`;

/** A stable id for a source of an AI index, from its type and value: reordering sources keeps it. */
export const ontologySourceId = ({ type, value }: Pick<AiIndexSource, 'type' | 'value'>): string =>
  shortHash(type, value.trim());

/** The URI an ontology KI cites a source of the AI index by. */
export const sourceUri = (sourceId: string): string => `${SOURCE_URI_PREFIX}${sourceId}`;

/** The source id a `source://` URI cites, if it is one. */
export const sourceIdFromUri = (uri: string): string | undefined =>
  uri.startsWith(SOURCE_URI_PREFIX) ? uri.slice(SOURCE_URI_PREFIX.length) : undefined;
