/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* RESEARCH ONLY (Track 7.A / worker Core). Read-mostly data replicated from main into the
 * alerting class isolate. Everything here is plain data. Config values stay in memory. */

import type { PlatformReplicas, ReadinessToken } from '../capability_kit/worker_core';

export interface IslandSnapshot {
  readonly kibanaVersion: string;
  readonly buildFlavor: 'traditional' | 'serverless';
  readonly buildNum: number;
  readonly buildSha: string;
  readonly instanceUuid: string;
  readonly dist: boolean;
  readonly dev: boolean;
  readonly basePath: { readonly serverBasePath: string; readonly publicBaseUrl?: string };
  /** `License.toJSON()` of main's current license. */
  readonly license: Record<string, unknown>;
  readonly allIndices: readonly string[];
  readonly defaultIndex: string;
  /** share locators visible to server code (id only; getRedirectUrl needs id + version + baseUrl). */
  readonly locatorIds: readonly string[];
  readonly uiamEnabled: boolean;
  readonly securityEnabled: boolean;
  /** `security.authz.mode.useRbacForRequest(fakeRequest)` as observed on main. */
  readonly useRbacForFakeRequest: boolean;
  readonly taskManagerIndex: string;
  /** Raw (unvalidated) plugin config by plugin id; validated in the isolate with each plugin's schema. */
  readonly rawConfig: Readonly<Record<string, Record<string, unknown>>>;
  /** Main's effective plugin config, already validated. Present values skip schema defaults. */
  readonly effectiveConfig?: Readonly<Record<string, Record<string, unknown>>>;
  /** Versioned license, flags, pricing, status and features. */
  readonly replicas?: PlatformReplicas;
  /** Saved-object type fingerprints minted by main after its migrations. */
  readonly readiness?: ReadinessToken;
  /** Main's definition metadata for types this class is allowed to run. */
  readonly taskDefinitionMeta?: ReadonlyArray<{
    readonly type: string;
    readonly timeout: string;
    readonly maxAttempts?: number;
    readonly cost?: string | number;
    readonly priority?: string | number;
    readonly stateSchemaVersions: readonly number[];
  }>;
}
