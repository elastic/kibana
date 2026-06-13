/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import description from './hypothesis_review.description.text';
import content from './hypothesis_review.skill.md.text';

export const hypothesisReviewSkill = defineSkillType({
  id: 'significant-events-investigation-review',
  name: 'significant-events-investigation-review',
  basePath: 'skills/platform/streams',
  description,
  content,
});
