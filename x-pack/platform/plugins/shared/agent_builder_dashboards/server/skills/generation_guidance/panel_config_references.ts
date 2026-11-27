/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getConfigPanelReferences } from '@kbn/dashboard-agent-authoring';
import type { ReferencedContent } from '@kbn/agent-builder-server/skills/type_definition';

/**
 * Agent-visible directory of the panel config references. Matches the skill mount (`/skills`),
 * base path (`skills/platform/dashboard`), skill name, and the references' `relativePath`.
 */
const PANEL_CONFIGS_RELATIVE_PATH = './panel_configs';
const PANEL_CONFIGS_PATH = '/skills/platform/dashboard/dashboards/panel_configs';

const configPanelReferences = getConfigPanelReferences();

/** Config shapes of the by-value panel types left out of the generate_dashboard tool schema. */
export const panelConfigReferences: ReferencedContent[] = configPanelReferences.map(
  ({ type, content }) => ({ name: type, relativePath: PANEL_CONFIGS_RELATIVE_PATH, content })
);

/** Tells the agent where to read each referenced panel type's config shape. */
export const panelConfigReferenceGuidance = `Before writing the \`config\` of one of these panel types, read its config reference with \`read_file\`: ${configPanelReferences
  .map(({ type, label }) => `\`${type}\` (${label}) at \`${PANEL_CONFIGS_PATH}/${type}.md\``)
  .join(', ')}.`;
