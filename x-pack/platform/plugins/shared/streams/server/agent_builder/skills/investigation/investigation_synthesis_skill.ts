/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import description from './investigation_synthesis.description.text';
import content from './investigation_synthesis.skill.md.text';

export const investigationSynthesisSkill = defineSkillType({
  id: 'significant-events-investigation-synthesis',
  name: 'significant-events-investigation-synthesis',
  basePath: 'skills/platform/streams',
  description,
  content,
});
