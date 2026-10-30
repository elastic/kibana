/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Internal: lists the automation templates and the parameters each install takes. */
export const AUTOMATION_TEMPLATES_PATH =
  '/internal/context_engine_agent_builder/automation_templates';

/** Internal: installs one automation template on an AI index, as the caller. */
export const INSTALL_AUTOMATION_TEMPLATE_PATH =
  '/internal/context_engine_agent_builder/ai_index/{aiIndexId}/automation_templates/_install';

export const AUTOMATION_TEMPLATES_API_VERSION = '1';
