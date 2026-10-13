/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReferencedContent } from '@kbn/agent-builder-server/skills/type_definition';
import kiShapesContent from './ki_shapes.md.text';
import strategyCatalogContent from './strategy_catalog.md.text';
import unitProfileTemplateContent from './unit_profile_template.yaml.text';

export const KI_SHAPES_REFERENCE_NAME = 'ki_shapes' as const;
export const STRATEGY_CATALOG_REFERENCE_NAME = 'strategy_catalog' as const;
export const UNIT_PROFILE_TEMPLATE_REFERENCE_NAME = 'unit-profile-template' as const;

/**
 * The KI document shape, shared by the three Context Engine setup skills so it is written once.
 */
export const kiShapesReference: ReferencedContent = {
  name: KI_SHAPES_REFERENCE_NAME,
  relativePath: '.',
  content: kiShapesContent,
};

/**
 * The strategy catalog (three choices, worked examples, corpus filter), shared the same way.
 */
export const strategyCatalogReference: ReferencedContent = {
  name: STRATEGY_CATALOG_REFERENCE_NAME,
  relativePath: '.',
  content: strategyCatalogContent,
};

/**
 * The `unit_profile` install template's YAML, exposed as a readable reference so
 * `ai-index-automations` can point a strategy with no template of its own at a complete, running
 * example to start from. This is a copy of
 * `install_automation_template/unit_profile_template.yaml.text` in `context_engine_agent_builder`
 * — that plugin renders it to install the real automation, this copy only needs to stay readable
 * by `load_skill`. Keep the two in sync when the template changes.
 */
export const unitProfileTemplateReference: ReferencedContent = {
  name: UNIT_PROFILE_TEMPLATE_REFERENCE_NAME,
  relativePath: '.',
  content: unitProfileTemplateContent,
};
