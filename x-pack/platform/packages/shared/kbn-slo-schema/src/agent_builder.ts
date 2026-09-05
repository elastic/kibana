/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { allOrAnyStringOrArray } from './schema/common';
import { indicatorSchema } from './schema/indicators';
import { timeWindowSchema } from './schema/time_window';
import {
  budgetingMethodSchema,
  objectiveSchema,
  optionalSettingsSchema,
  sloIdSchema,
  tagsSchema,
} from './schema/slo';

export const SLO_MANAGEMENT_SKILL_ID = 'observability.slo-management' as const;
export const SLO_DEFINITION_ATTACHMENT_TYPE_ID = 'observability.slo.definition' as const;

export const SLO_AGENT_TOOL_IDS = {
  listSlos: 'observability.list_slos',
  manageSlo: 'observability.manage_slo',
  deleteSlo: 'observability.delete_slo',
} as const;

export const sloDefinitionAttachmentDataSchema = t.intersection([
  t.type({
    name: t.string,
    description: t.string,
    indicator: indicatorSchema,
    timeWindow: timeWindowSchema,
    budgetingMethod: budgetingMethodSchema,
    objective: objectiveSchema,
  }),
  t.partial({
    id: sloIdSchema,
    settings: optionalSettingsSchema,
    tags: tagsSchema,
    groupBy: allOrAnyStringOrArray,
    revision: t.number,
    enabled: t.boolean,
    createdAt: t.string,
    updatedAt: t.string,
    version: t.number,
  }),
]);

export type SloDefinitionAttachmentData = t.TypeOf<typeof sloDefinitionAttachmentDataSchema>;
export type SloDefinitionAttachmentDataInput = t.InputOf<typeof sloDefinitionAttachmentDataSchema>;
