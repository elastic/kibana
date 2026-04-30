/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import type { EbtTelemetryClient } from '../../../lib/telemetry/ebt';
import type { WorkflowsManagementApi } from '../../../lib/workflows/workflow_execution_client';
import { createKiIdentificationCancelTool } from '../../tools/ki_identification_cancel/tool';
import { createKiIdentificationStartTool } from '../../tools/ki_identification_start/tool';
import { createKiIdentificationStatusTool } from '../../tools/ki_identification_status/tool';
import description from './description.text';
import content from './skill.md.text';

export const createKiIdentificationManagementSkill = ({
  telemetry,
  workflowsManagementApi,
}: {
  telemetry: EbtTelemetryClient;
  workflowsManagementApi: WorkflowsManagementApi;
}) =>
  defineSkillType({
    id: 'ki-identification-management',
    name: 'ki-identification-management',
    basePath: 'skills/platform/streams',
    description,
    content,
    getInlineTools: () => [
      createKiIdentificationCancelTool({ workflowsManagementApi }),
      createKiIdentificationStartTool({ workflowsManagementApi, telemetry }),
      createKiIdentificationStatusTool({ workflowsManagementApi }),
    ],
  });
