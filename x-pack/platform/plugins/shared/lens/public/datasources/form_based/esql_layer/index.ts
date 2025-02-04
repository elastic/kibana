/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExpressionsStart } from '@kbn/expressions-plugin/public';
import { DataPublicPluginSetup, DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { EditorFrameSetup } from '../../../types';

export interface TextBasedSetupPlugins {
  data: DataPublicPluginSetup;
  editorFrame: EditorFrameSetup;
}

export interface TextBasedStartPlugins {
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  expressions: ExpressionsStart;
}
