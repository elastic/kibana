/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sourceConnectedDestinationIds } from '../../../streams_layout/sources/source_models';
import { useCanvasUnitDefinition } from './state_management';

/** Destinations a source reaches in the unit with unsaved edits, so flyouts follow the canvas before a save. */
export const useStagedSourceConnectedDestinationIds = (): ReadonlySet<string> =>
  sourceConnectedDestinationIds(useCanvasUnitDefinition());
