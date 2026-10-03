/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import { visualizationCreationSkill } from './visualization_creation_skill';

describe('visualizationCreationSkill', () => {
  it('routes document tables to discover-session only when that skill is available', () => {
    expect(visualizationCreationSkill.content).toContain(
      'raw documents, events, search hits, or a Discover-style document table'
    );
    expect(visualizationCreationSkill.content).toContain(
      'If the discover-session skill is listed in the available or relevant skills'
    );
    expect(visualizationCreationSkill.content).toContain(platformCoreTools.createDiscoverSession);
    expect(visualizationCreationSkill.content).toContain(
      'Do **not** use chartType `"data_table"` as a substitute for that Discover table'
    );
    expect(visualizationCreationSkill.content).toContain(
      'If discover-session is not available, do not use this skill for those requests.'
    );
    expect(visualizationCreationSkill.content).toContain(
      'The user only needs other table/query output without a visualization.'
    );
  });

  it('does not load createDiscoverSession', () => {
    expect(visualizationCreationSkill.getRegistryTools?.()).toEqual([
      platformCoreTools.generateEsql,
      platformCoreTools.executeEsql,
      platformCoreTools.createVisualization,
    ]);
  });
});
