/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexStorageSettings } from '@kbn/storage-adapter';
import { types } from '@kbn/storage-adapter';
import { COMPONENT_DIAGRAM_INDEX_NAME } from '../../../common/component_diagram/constants';
import type { InvestigationComponentDiagram } from '../../../common/component_diagram/component_diagram';

/**
 * Mapping changes must stay additive: the adapter applies them in place with `putMapping`.
 * The diagram is stored but not indexed; readers load it by conversation.
 */
export const componentDiagramStorageSettings = {
  name: COMPONENT_DIAGRAM_INDEX_NAME,
  schema: {
    properties: {
      spaceId: types.keyword({}),
      conversationId: types.keyword({}),
      title: types.keyword({ index: false }),
      mermaid: types.text({ index: false }),
      problemNodeIds: types.keyword({ index: false }),
      description: types.text({ index: false }),
      createdAt: types.date({}),
      updatedAt: types.date({}),
      createdBy: types.object({
        properties: {
          username: types.keyword({}),
          fullName: types.keyword({}),
          email: types.keyword({}),
          profileUid: types.keyword({}),
        },
      }),
    },
  },
} satisfies IndexStorageSettings;

export type ComponentDiagramStorageSettings = typeof componentDiagramStorageSettings;

/** Stored shape: the id lives in `_id`, everything else in `_source`. */
export type ComponentDiagramDocument = Omit<InvestigationComponentDiagram, 'id'>;
