/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { platformCoreTools } from '@kbn/agent-builder-common/tools';
import { internalNamespaces } from '@kbn/agent-builder-common/base/namespaces';
import content from './analyze_and_improve.skill.md.text';

export const analyzeAndImproveSkill = defineSkillType({
  id: 'analyze-and-improve',
  name: 'analyze-and-improve',
  basePath: 'skills/platform/context-engine',
  experimental: true,
  description:
    'Diagnose why a Context Engine AI index is not serving agents well and propose changes to its knowledge indicator pipeline. Load when analyzing Context Engine signals (query_error, empty_retrieval, coverage_gap) for an AI index, when handling an "Analyze & improve" hand-off, or when a user asks why an index\'s knowledge indicators are not being retrieved or why an agent keeps falling back to raw data. Read-only: it proposes changes, it never applies them.',
  content,
  referencedContent: [],
  getRegistryTools: () => [
    platformCoreTools.executeEsql,
    platformCoreTools.listIndices,
    `${internalNamespaces.workflows}.get_workflow`,
    // Read-only despite the verb: it parses a candidate definition and reports what is wrong with
    // it, saving a reviewer a proposal whose YAML was never going to load.
    `${internalNamespaces.workflows}.validate_workflow`,
  ],
});
