/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import {
  STREAMS_RUN_INVESTIGATION_TOOL_ID,
  STREAMS_SHOW_INVESTIGATION_TOOL_ID,
} from '../../tools/register_tools';
import description from './investigation_runner.description.text';
import content from './investigation_runner.skill.md.text';

export const investigationRunnerSkill = defineSkillType({
  id: 'significant-events-investigation-runner',
  name: 'significant-events-investigation-runner',
  basePath: 'skills/platform/streams',
  description,
  content,
  getRegistryTools: () => [STREAMS_RUN_INVESTIGATION_TOOL_ID, STREAMS_SHOW_INVESTIGATION_TOOL_ID],
});
