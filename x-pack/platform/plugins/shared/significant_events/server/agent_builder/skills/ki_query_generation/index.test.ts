/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformSignificantEventsTools } from '@kbn/agent-builder-common/tools';
import { kiQueryGenerationSkill } from '.';

describe('kiQueryGenerationSkill', () => {
  it('binds only query-generation registry tools', () => {
    expect(kiQueryGenerationSkill.getRegistryTools?.()).toEqual([
      platformSignificantEventsTools.getStreamFeatures,
      platformSignificantEventsTools.validateQueries,
    ]);
    expect(kiQueryGenerationSkill.getInlineTools).toBeUndefined();
  });
});
