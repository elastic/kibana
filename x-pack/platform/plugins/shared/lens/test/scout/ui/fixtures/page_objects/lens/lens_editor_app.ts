/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LensApp } from '@kbn/scout';
import { withLensLayers } from './lens_layers_mixin';
import { withLensDimensions } from './lens_dimensions_mixin';
import { withLensStyle } from './lens_style_mixin';
import { withLensMetric } from './lens_metric_mixin';
import { withLensDatatable } from './lens_datatable_mixin';
import { withLensDragDrop } from './lens_drag_drop_mixin';
import { withLensWorkspace } from './lens_workspace_mixin';

/**
 * Lens-editor page object used by Lens's own Scout suites. Extends the shared, cross-plugin
 * `LensApp` from `@kbn/scout` (navigation, saving, chart switching, `configureDimension`,
 * `dragFieldToWorkspace`, …) with editor-only behavior split across topic-specific mixins —
 * layers, dimension-editor details, style/palette, metric, datatable, drag-and-drop variants,
 * and general workspace chrome.
 *
 * Kept as a single flat class (via mixins, not composed sub-objects) so Lens's ~50 existing
 * Scout specs keep calling `lens.someMethod()` directly, with no call-site churn. See
 * https://github.com/elastic/kibana/issues/282064 and
 * https://github.com/elastic/kibana/pull/280337#discussion_r3681254967.
 */
export class LensEditorApp extends withLensWorkspace(
  withLensDragDrop(
    withLensDatatable(withLensMetric(withLensStyle(withLensDimensions(withLensLayers(LensApp)))))
  )
) {}
