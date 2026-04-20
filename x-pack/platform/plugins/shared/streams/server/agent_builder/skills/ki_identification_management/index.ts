/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import {
  STREAMS_KI_IDENTIFICATION_CANCEL_TOOL_ID,
  STREAMS_KI_IDENTIFICATION_START_TOOL_ID,
  STREAMS_KI_IDENTIFICATION_STATUS_TOOL_ID,
} from '../../tools/register_tools';
import description from './description.text';
import content from './skill.md.text';

export const kiIdentificationManagementSkill = defineSkillType({
  id: 'ki-identification-management',
  name: 'ki-identification-management',
  basePath: 'skills/platform/streams',
  description,
  content,
  getRegistryTools: () => [
    STREAMS_KI_IDENTIFICATION_CANCEL_TOOL_ID,
    STREAMS_KI_IDENTIFICATION_START_TOOL_ID,
    STREAMS_KI_IDENTIFICATION_STATUS_TOOL_ID,
  ],
});
