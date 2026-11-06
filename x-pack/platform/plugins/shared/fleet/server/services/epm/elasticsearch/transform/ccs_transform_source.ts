/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

import { appContextService } from '../../../app_context';

// The only transform that ships a cross-cluster (`*:`) source today is Elastic Defend's
// `metadata_united`. The strip below is intentionally scoped to it by name to keep the
// blast radius minimal — this is a temporary bridge until per-environment transform
// variants land (a `_meta.environments`-gated install). The fragment matches both the v1
// (`endpoint.metadata_united-…`) and v2 (`logs-endpoint.metadata_united-…`) transform ids.
const DEFEND_METADATA_UNITED_TRANSFORM_ID_FRAGMENT = 'endpoint.metadata_united-';

/**
 * Minimal shape of a transform being installed that this module needs. Kept structural so
 * this (temporary) module does not depend on `install.ts`.
 */
interface InstallableTransform {
  installationName: string;
  content: { source?: { index?: string | string[] } };
}

/**
 * Whether an index expression targets a remote cluster (`<cluster>:<index>`, e.g.
 * `*:metrics-endpoint.metadata_current_default*`). Mirrors ES
 * `RemoteClusterAware#isRemoteIndexName`.
 *
 * Index *names* cannot contain `:` (ES rejects it at index creation — see
 * `MetadataCreateIndexService#validateIndexOrAliasName`). So the only places a `:` can appear
 * in a valid index expression are:
 *   1. the remote-cluster separator: `<cluster>:<index>` (what we're detecting);
 *   2. the `::` data-stream selector separator (e.g. `logs::failures`);
 *   3. a timezone inside date-math, e.g. `<logs-{now/d{yyyy.MM.dd|+12:00}}>` — and date math is
 *      always wrapped in `<...>` (or `-<...>`), never bare.
 *
 * Hence: exclude anything starting with `<`/`-<` (date math, never remote), then treat the
 * FIRST `:` as the cluster separator unless it's a `::` selector. A trailing timezone colon
 * can't reach a non-date-math expression, so it never needs special handling here.
 */
export const isRemoteIndexExpression = (indexExpression: string): boolean => {
  if (
    indexExpression.length === 0 ||
    indexExpression.startsWith('<') ||
    indexExpression.startsWith('-<')
  ) {
    return false;
  }
  const separatorIndex = indexExpression.indexOf(':');
  return separatorIndex > 0 && !indexExpression.startsWith('::', separatorIndex);
};

/**
 * Cross-cluster search (the `<remote>:<index>` source syntax) is a stateful-only
 * Elasticsearch feature. On Serverless, ES rejects a transform whose source targets
 * remote indices with `action_request_validation_exception` ("Cross-project calls are
 * not supported, but remote indices were requested"), which aborts the whole package
 * install. Strip the remote-cluster entries from the Defend `metadata_united` transform's
 * source on Serverless so it installs and runs against its local indices. Scoped to that
 * one transform by name (see above); a no-op on stateful, where remote patterns are valid
 * and resolve to empty when no remote is connected.
 */
export const removeRemoteClusterSourceIndicesOnServerless = (
  transform: InstallableTransform,
  logger: Logger
): void => {
  if (!appContextService.getCloud()?.isServerlessEnabled) {
    return;
  }
  if (!transform.installationName.includes(DEFEND_METADATA_UNITED_TRANSFORM_ID_FRAGMENT)) {
    return;
  }
  const source = transform.content?.source;
  if (!source?.index) {
    return;
  }
  const indices: string[] = Array.isArray(source.index) ? source.index : [source.index];
  const remoteIndices = indices.filter((index) => isRemoteIndexExpression(index));
  const localIndices = indices.filter((index) => !isRemoteIndexExpression(index));
  // Only rewrite when remotes were actually present and at least one local index
  // remains; a transform sourced solely from remote indices is a package error we
  // shouldn't silently turn into an empty (and invalid) source.
  if (remoteIndices.length > 0 && localIndices.length > 0) {
    logger.info(
      `Removed cross-cluster source indices [${remoteIndices.join(', ')}] from transform [${
        transform.installationName
      }] on Serverless; cross-cluster search is not supported there.`
    );
    source.index = localIndices;
  }
};
