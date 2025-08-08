/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getImageRenderer } from '../canvas_plugin_src/renderers/image';
import { getErrorRenderer } from '../canvas_plugin_src/renderers/error';
import { getDebugRenderer } from '../canvas_plugin_src/renderers/debug';
import { getMarkdownRenderer } from '../canvas_plugin_src/renderers/markdown';
import { getMetricRenderer } from '../canvas_plugin_src/renderers/metric';
import { pie } from '../canvas_plugin_src/renderers/pie';
import { plot } from '../canvas_plugin_src/renderers/plot';
import { getProgressRenderer } from '../canvas_plugin_src/renderers/progress';
import { getRepeatImageRenderer } from '../canvas_plugin_src/renderers/repeat_image';
import { getRevealImageRenderer } from '../canvas_plugin_src/renderers/reveal_image';
import { getShapeRenderer } from '../canvas_plugin_src/renderers/shape';
import { getTextRenderer } from '../canvas_plugin_src/renderers/text';
import { getTableRenderer } from '../canvas_plugin_src/renderers/table';

/**
 * FIXME: Render function factories require stateful dependencies to be
 * injected. Without them, we can not provide proper theming, i18n, or
 * telemetry when fatal errors occur during rendering.
 */
const unboxFactory = (factory) => factory();

const renderFunctionsFactories = [
  getDebugRenderer,
  getErrorRenderer,
  getImageRenderer,
  getMarkdownRenderer,
  getMetricRenderer,
  getProgressRenderer,
  getRevealImageRenderer,
  getRepeatImageRenderer,
  getShapeRenderer,
  getTextRenderer,
  getTableRenderer,
];

/**
 * This is a collection of renderers which are bundled with the runtime.  If
 * a renderer is not listed here, but is used by the Shared Workpad, it will
 * not render.  This includes any plugins.
 */
export const renderFunctions = [pie, plot, ...renderFunctionsFactories.map(unboxFactory)];

export const renderFunctionNames = [...renderFunctions.map((fn) => fn().name)];
