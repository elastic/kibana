/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore Untyped local
import { error } from '../../../canvas_plugin_src/renderers/error';
// @ts-ignore Untyped local
import { markdown } from '../../../canvas_plugin_src/renderers/markdown';
import { metric } from '../../../canvas_plugin_src/renderers/metric';
// @ts-ignore Untyped local
import { progress } from '../../../canvas_plugin_src/renderers/progress';
// @ts-ignore Untyped local
import { revealImage } from '../../../canvas_plugin_src/renderers/reveal_image';
// @ts-ignore Untyped local
import { shape } from '../../../canvas_plugin_src/renderers/shape';
// @ts-ignore Untyped local
import { debug } from '../../../canvas_plugin_src/renderers/debug';
// @ts-ignore Untyped local
import { image } from '../../../canvas_plugin_src/renderers/image';
// @ts-ignore Untyped local
import { repeatImage } from '../../../canvas_plugin_src/renderers/repeat_image';
// @ts-ignore Untyped local
import { table } from '../../../canvas_plugin_src/renderers/table';
// @ts-ignore Untyped local
import { text } from '../../../canvas_plugin_src/renderers/text';

export const renderers = [
  error,
  markdown,
  metric,
  progress,
  revealImage,
  shape,
  debug,
  image,
  repeatImage,
  table,
  text,
];
