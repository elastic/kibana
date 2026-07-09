/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CODE_ANALYSIS_FEATURE_TYPE, type BaseFeature } from '@kbn/significant-events-schema';
import {
  CODE_FEATURE_META_CHANGE_FINGERPRINT,
  CODE_FEATURE_META_REPOSITORY,
  CODE_FEATURE_SUBTYPE_REPO_TYPE,
} from './constants';

export interface CodeChangeState {
  repository?: string;
  fingerprint?: string;
}

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

/**
 * Reads the last-processed repository + change fingerprint from an existing
 * `repo_type` code feature's `meta`. Returns empty state when no such feature
 * exists yet (first run for the stream).
 */
export function readCodeChangeState(features: BaseFeature[]): CodeChangeState {
  const repoTypeFeature = features.find(
    (feature) =>
      feature.type === CODE_ANALYSIS_FEATURE_TYPE &&
      feature.subtype === CODE_FEATURE_SUBTYPE_REPO_TYPE
  );
  const meta = repoTypeFeature?.meta ?? {};
  return {
    repository: asString(meta[CODE_FEATURE_META_REPOSITORY]),
    fingerprint: asString(meta[CODE_FEATURE_META_CHANGE_FINGERPRINT]),
  };
}

/**
 * Builds the `meta` object carrying code provenance + change-detection state,
 * to be attached to the `repo_type` feature so the next run can noop.
 */
export function buildCodeChangeMeta({
  repository,
  fingerprint,
}: {
  repository: string;
  fingerprint: string | undefined;
}): Record<string, unknown> {
  return {
    [CODE_FEATURE_META_REPOSITORY]: repository,
    ...(fingerprint ? { [CODE_FEATURE_META_CHANGE_FINGERPRINT]: fingerprint } : {}),
  };
}

/**
 * Whether the repository is unchanged since the last processed fingerprint.
 * A missing current fingerprint is treated as "changed" so we do not silently
 * skip when change detection is unavailable.
 */
export function isUnchanged(
  state: CodeChangeState,
  currentFingerprint: string | undefined
): boolean {
  return (
    currentFingerprint !== undefined &&
    state.fingerprint !== undefined &&
    state.fingerprint === currentFingerprint
  );
}
