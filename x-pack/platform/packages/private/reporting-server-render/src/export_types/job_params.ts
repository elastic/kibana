/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseParamsV2, BasePayload, LocatorParams } from '@kbn/reporting-common/types';

/**
 * Phase 3: replaces the Phase 1/2 prototype's hand-written `panels` list (a fixed set of
 * `markdown`/`datatable`/`sampleLineChart` entries the caller had to pre-resolve) with the
 * real `locatorParams`-based job shape the Chromium-based export types
 * (`JobParamsPNGV2`/`JobParamsPDFV2`, see `@kbn/reporting-export-types-{png,pdf}-common`) use.
 * Resolution now happens by navigating the headless client worker to the locator's URL (Phase
 * 2) and reading the real rendered DOM/saved-object grid data (Phase 3's
 * `dashboard_panel_layout.ts`/`element_sinks.ts`), not by the caller pre-resolving panels.
 *
 * Deliberately only ever carries a single `LocatorParams` (one dashboard/visualization per
 * report), unlike `JobParamsPDFV2`'s array (one entry per `print` layout page): this
 * prototype does not yet implement the `print` layout's one-panel-per-page PDF mode (see the
 * package README's coverage matrix).
 */
export interface ServerRenderJobParams extends BaseParamsV2 {
  locatorParams: [LocatorParams];
}

export interface ServerRenderTaskPayload extends BasePayload {
  forceNow: string;
  locatorParams: [LocatorParams];
}
