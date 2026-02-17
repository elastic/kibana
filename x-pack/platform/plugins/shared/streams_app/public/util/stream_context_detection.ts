/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { safeDecode, type RisonValue } from '@kbn/rison';

/**
 * Extracts the stream name from an ES|QL query string.
 * Parses FROM or TS clauses to find the data source name.
 *
 * @param esqlQuery - The ES|QL query string
 * @returns The stream name if found, undefined otherwise
 *
 * @example
 * parseStreamFromEsqlQuery('FROM logs.abc | LIMIT 10') // 'logs.abc'
 * parseStreamFromEsqlQuery('TS metrics.system,metrics.system.* METADATA _source') // 'metrics.system'
 */
export function parseStreamFromEsqlQuery(esqlQuery: string): string | undefined {
  if (!esqlQuery) {
    return undefined;
  }

  // Match FROM or TS followed by the source name
  // Supports: FROM <name>, FROM <name>,<name>.*, TS <name>, etc.
  // The source name can contain dots, hyphens, underscores, and wildcards
  const fromMatch = esqlQuery.match(/^\s*(?:FROM|TS)\s+([^\s,|]+)/i);

  if (fromMatch && fromMatch[1]) {
    // Clean up the source name - remove any trailing wildcards or metadata
    let sourceName = fromMatch[1];

    // Remove trailing wildcards like .* from the name
    sourceName = sourceName.replace(/\.\*$/, '');

    // Remove any leading/trailing whitespace
    sourceName = sourceName.trim();

    // Basic validation - should start with a letter or underscore
    if (sourceName && /^[a-zA-Z_]/.test(sourceName)) {
      return sourceName;
    }
  }

  return undefined;
}

/**
 * Extracts query state from a Kibana URL hash.
 * Handles both _a and _q state parameters.
 */
function parseStateFromHash(hash: string): RisonValue | null {
  if (!hash) {
    return null;
  }

  // Remove leading #
  const hashContent = hash.startsWith('#') ? hash.slice(1) : hash;

  // Try to parse as URL search params
  try {
    const params = new URLSearchParams(hashContent);

    // Try _a (app state) first
    const appState = params.get('_a');
    if (appState) {
      return safeDecode(appState);
    }

    // Try _q (query state)
    const queryState = params.get('_q');
    if (queryState) {
      return safeDecode(queryState);
    }
  } catch {
    // URL parsing failed
  }

  // Try parsing the entire hash as rison (some Kibana URLs encode state directly)
  return safeDecode(hashContent);
}

/**
 * Checks if an object is a potential ES|QL query object.
 */
function isEsqlQueryObject(obj: unknown): obj is { esql: string } {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'esql' in obj &&
    typeof (obj as { esql: unknown }).esql === 'string'
  );
}

/**
 * Extracts stream name from a parsed Kibana state object.
 */
function extractStreamFromState(state: RisonValue): string | undefined {
  if (!state || typeof state !== 'object' || state === null) {
    return undefined;
  }

  const stateObj = state as Record<string, RisonValue>;

  // Check for query object with esql property
  if (isEsqlQueryObject(stateObj.query)) {
    return parseStreamFromEsqlQuery(stateObj.query.esql);
  }

  // Check nested query in _q or similar structures
  if (isEsqlQueryObject(stateObj)) {
    return parseStreamFromEsqlQuery(stateObj.esql);
  }

  return undefined;
}

/**
 * Result of stream context detection.
 */
export interface StreamContextDetectionResult {
  /** The detected stream name */
  streamName: string | undefined;
  /** The source of the detection */
  source: 'esql_query' | 'streams_app' | 'url_param' | 'none';
}

/**
 * Detects stream context from the current URL.
 *
 * Checks multiple sources in order:
 * 1. Direct stream name from URL query parameter (?stream=<name>)
 * 2. ES|QL query in Discover URL state
 * 3. Stream name from streams app URL path
 *
 * @param location - The current browser location
 * @param basePath - The Kibana base path prepend function
 * @returns Detection result with stream name and source
 */
export function detectStreamContext(
  location: { pathname: string; search: string; hash: string },
  basePath: { prepend: (path: string) => string }
): StreamContextDetectionResult {
  const { pathname, search, hash } = location;

  // 1. Check for direct stream parameter in URL
  const searchParams = new URLSearchParams(search);
  const directStreamParam = searchParams.get('stream') || searchParams.get('streamName');
  if (directStreamParam) {
    return {
      streamName: directStreamParam,
      source: 'url_param',
    };
  }

  // 2. Check if we're in Discover and parse ES|QL query
  const discoverAppPath = basePath.prepend('/app/discover');
  if (pathname.startsWith(discoverAppPath) || pathname.includes('/app/discover')) {
    const state = parseStateFromHash(hash);
    if (state) {
      const streamName = extractStreamFromState(state);
      if (streamName) {
        return {
          streamName,
          source: 'esql_query',
        };
      }
    }
  }

  // 3. Check if we're in the streams app and extract stream from path
  const streamsAppPath = basePath.prepend('/app/streams');
  if (pathname.startsWith(streamsAppPath) || pathname.includes('/app/streams')) {
    // Path format: /app/streams/{streamName}/...
    const pathMatch = pathname.match(/\/app\/streams\/([^/]+)/);
    if (pathMatch && pathMatch[1] && pathMatch[1] !== '_discovery') {
      return {
        streamName: decodeURIComponent(pathMatch[1]),
        source: 'streams_app',
      };
    }
  }

  return {
    streamName: undefined,
    source: 'none',
  };
}

/**
 * Creates a URL for the stream content popover with context parameters.
 *
 * @param streamName - The stream name to include in the URL
 * @param currentPath - The current path to return to after closing
 * @returns URL string with query parameters
 */
export function createContentPopoverUrl(
  streamName: string,
  basePath: { prepend: (path: string) => string },
  currentPath?: string
): string {
  const params = new URLSearchParams();
  params.set('stream', streamName);
  if (currentPath) {
    params.set('returnTo', currentPath);
  }
  return `${basePath.prepend('/app/streams')}/_content?${params.toString()}`;
}
