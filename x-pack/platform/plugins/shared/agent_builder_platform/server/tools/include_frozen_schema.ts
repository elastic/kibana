/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { AGENT_BUILDER_INCLUDE_FROZEN_BY_DEFAULT_SETTING_ID } from '@kbn/management-settings-ids';
import type { ToolSchemaContext } from '@kbn/agent-builder-server';

const excludedByDefaultDescription =
  '(Optional) Include indices on the frozen tier. Defaults to false, since querying the frozen tier recovers searchable snapshots from object storage, which is slow and can time out. Only set to true when the user or the agent instructions explicitly ask for frozen tier data.';

const includedByDefaultDescription =
  '(Optional) Include indices on the frozen tier. Defaults to true. Querying the frozen tier recovers searchable snapshots from object storage, which is slow and can time out. Only set to false when the user or the agent instructions explicitly ask to exclude frozen tier data.';

/**
 * Flag shared by the built-in tools that read index data, letting the agent choose whether
 * frozen tier indices are included, with a default that depends on the space's settings.
 */
export const createIncludeFrozenSchema = (includeFrozenByDefault: boolean) =>
  z
    .boolean()
    .default(includeFrozenByDefault)
    .describe(includeFrozenByDefault ? includedByDefaultDescription : excludedByDefaultDescription);

/**
 * Whether the built-in tools include frozen tier indices by default in the current space.
 */
export const getIncludeFrozenByDefault = ({ uiSettings }: ToolSchemaContext): Promise<boolean> =>
  uiSettings.get<boolean>(AGENT_BUILDER_INCLUDE_FROZEN_BY_DEFAULT_SETTING_ID);
