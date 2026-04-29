/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import type { Logger } from '@kbn/core/server';
import type { GetScopedClients } from '../../../routes/types';
import type { StreamsServer } from '../../../types';
import { createEventTool } from '../../tools/event_create/tool';
import { createDemoteEventTool } from '../../tools/event_demote/tool';
import { createSearchEventsTool } from '../../tools/event_search/tool';
import description from './description.text';
import content from './skill.md.text';

export const createSigEventsManagementSkill = ({
  getScopedClients,
  server,
  logger,
}: {
  getScopedClients: GetScopedClients;
  server: StreamsServer;
  logger: Logger;
}) =>
  defineSkillType({
    id: 'sig-events-management',
    name: 'sig-events-management',
    basePath: 'skills/platform/streams',
    description,
    content,
    getInlineTools: () => [
      createSearchEventsTool({
        getScopedClients,
        server,
        logger: logger.get('event_search_tool'),
      }),
      createEventTool({
        getScopedClients,
        server,
        logger: logger.get('event_create_tool'),
      }),
      createDemoteEventTool({
        getScopedClients,
        server,
        logger: logger.get('event_demote_tool'),
      }),
    ],
  });
