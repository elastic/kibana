/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { platformCoreTools } from '@kbn/agent-builder-common/tools';
import { internalNamespaces } from '@kbn/agent-builder-common/base/namespaces';
import content from './ai_index_sources.skill.md.text';

export const aiIndexSourcesSkill = defineSkillType({
  id: 'ai-index-sources',
  name: 'ai-index-sources',
  basePath: 'skills/platform/context-engine',
  experimental: true,
  description:
    'Choose and configure the data a Context Engine AI index draws on. Load when picking which Elasticsearch indices or connectors should feed an AI index, when writing or fixing an ES|QL source query, when agreeing the corpus filter that bounds one, or when working out whether a coverage gap is a source problem.',
  content,
  getRegistryTools: () => [
    platformCoreTools.listIndices,
    platformCoreTools.getIndexMapping,
    platformCoreTools.executeEsql,
    platformCoreTools.generateEsql,
    `${internalNamespaces.workflows}.get_connectors`,
    `${internalNamespaces.workflows}.get_step_definitions`,
  ],
});
