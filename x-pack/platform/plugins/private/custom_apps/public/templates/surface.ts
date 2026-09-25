/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { A2uiMessage, ComponentDefinition, JsonValue } from '@kbn/a2ui-renderer';
import type { CustomAppDefinition } from '../../common/app_definition';

export const CATALOG_ID = 'elastic/kibana-eui/v1';

/** A panel's contents as the single `createSurface` message the renderer replays. */
export const surface = (
  surfaceId: string,
  components: ComponentDefinition[],
  dataModel: Record<string, JsonValue> = {}
): A2uiMessage[] => [
  { version: 'v1.0', createSurface: { surfaceId, catalogId: CATALOG_ID, dataModel, components } },
];

export interface CustomAppTemplate {
  id: string;
  name: string;
  description: string;
  /** The index every one of this template's queries reads, asserted in tests. */
  indexPattern: string;
  build: () => CustomAppDefinition;
}
