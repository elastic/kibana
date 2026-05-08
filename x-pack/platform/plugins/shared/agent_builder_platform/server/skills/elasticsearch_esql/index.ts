/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import description from './description.text';
import content from './skill.md.text';
import dslToEsqlMigrationContent from './references/dsl-to-esql-migration.text';
import esqlReferenceContent from './references/esql-reference.text';
import esqlSearchStrategyContent from './references/esql-search-strategy.text';
import esqlSearchContent from './references/esql-search.text';
import esqlVersionHistoryContent from './references/esql-version-history.text';
import generationTipsContent from './references/generation-tips.text';
import queryPatternsContent from './references/query-patterns.text';
import timeSeriesQueriesContent from './references/time-series-queries.text';

export const elasticsearchEsqlSkill = defineSkillType({
  id: 'elasticsearch-esql',
  name: 'elasticsearch-esql',
  basePath: 'skills/platform/esql',
  description,
  content,
  referencedContent: [
    {
      relativePath: './references',
      name: 'dsl-to-esql-migration',
      content: dslToEsqlMigrationContent,
    },
    {
      relativePath: './references',
      name: 'esql-reference',
      content: esqlReferenceContent,
    },
    {
      relativePath: './references',
      name: 'esql-search-strategy',
      content: esqlSearchStrategyContent,
    },
    {
      relativePath: './references',
      name: 'esql-search',
      content: esqlSearchContent,
    },
    {
      relativePath: './references',
      name: 'esql-version-history',
      content: esqlVersionHistoryContent,
    },
    {
      relativePath: './references',
      name: 'generation-tips',
      content: generationTipsContent,
    },
    {
      relativePath: './references',
      name: 'query-patterns',
      content: queryPatternsContent,
    },
    {
      relativePath: './references',
      name: 'time-series-queries',
      content: timeSeriesQueriesContent,
    },
  ],
  getRegistryTools: () => [
    platformCoreTools.testEsql,
    platformCoreTools.listIndices,
    platformCoreTools.getIndexMapping,
    platformCoreTools.executeEsql,
  ],
});
