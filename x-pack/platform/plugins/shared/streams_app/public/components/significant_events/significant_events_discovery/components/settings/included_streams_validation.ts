/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Streams } from '@kbn/streams-schema';
import { minimatch } from 'minimatch';

/**
 * Parses the comma-separated "Included streams" text into a list of trimmed,
 * non-empty patterns. Mirrors the server-side `parseStreamPatterns` so the UI
 * validates against the same input the onboarding selection uses.
 */
export const parseIncludedStreamPatterns = (raw: string | undefined): string[] =>
  (raw ?? '')
    .split(',')
    .map((pattern) => pattern.trim())
    .filter(Boolean);

/**
 * A stream type supported by continuous knowledge indicator onboarding. Mirrors
 * the server-side `isSupportedStream`; kept here because the server module lives
 * behind a plugin boundary the UI bundle can't import.
 */
export const isSupportedStream = (stream: Streams.all.Definition): boolean =>
  Streams.WiredStream.Definition.is(stream) ||
  Streams.ClassicStream.Definition.is(stream) ||
  Streams.QueryStream.Definition.is(stream);

/**
 * Returns the include patterns that match no supported stream name, so the UI
 * can warn before saving a pattern that would silently onboard nothing.
 */
export const findUnmatchedIncludePatterns = (
  patterns: string[],
  supportedStreamNames: string[]
): string[] =>
  patterns.filter((pattern) => !supportedStreamNames.some((name) => minimatch(name, pattern)));
