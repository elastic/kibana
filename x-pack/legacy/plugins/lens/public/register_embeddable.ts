/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { indexPatternDatasourceSetup } from './indexpattern_plugin';
import { xyVisualizationSetup } from './xy_visualization_plugin';
import { editorFrameSetup, editorFrameStart } from './editor_frame_plugin';
import { datatableVisualizationSetup } from './datatable_visualization_plugin';
import { metricVisualizationSetup } from './metric_visualization_plugin';

// bootstrap shimmed plugins to register everything necessary (expression functions and embeddables).
// the new platform will take care of this once in place.
indexPatternDatasourceSetup();
datatableVisualizationSetup();
xyVisualizationSetup();
metricVisualizationSetup();
editorFrameSetup();
editorFrameStart();
