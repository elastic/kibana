/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AgentsServiceStartContract,
  AttachmentServiceStartContract,
} from '@kbn/agent-builder-browser';
import type { ILocatorClient } from '@kbn/share-plugin/common/url_service';
import type { CoreStart } from '@kbn/core/public';
import { AttachmentType } from '@kbn/agent-builder-common/attachments';
import { GRAPH_ATTACHMENT_TYPE, SKILL_ATTACHMENT_TYPE } from '../../common/attachments';
import { createEsqlAttachmentDefinition } from './esql_attachment';
import { textAttachmentDefinition } from './text_attachment';
import { screenContextAttachmentDefinition } from './screen_context_attachment';
import { graphAttachmentDefinition } from './graph_attachment/graph_attachment';
import { createSkillAttachmentDefinition } from './skill_attachment/skill_attachment';

export const registerAttachmentUiDefinitions = ({
  attachments,
  agents,
  locators,
  core,
}: {
  attachments: AttachmentServiceStartContract;
  agents: AgentsServiceStartContract;
  locators: ILocatorClient;
  core: CoreStart;
}) => {
  attachments.addAttachmentType(AttachmentType.text, textAttachmentDefinition);
  attachments.addAttachmentType(AttachmentType.screenContext, screenContextAttachmentDefinition);
  attachments.addAttachmentType(AttachmentType.esql, createEsqlAttachmentDefinition({ locators }));
  attachments.addAttachmentType(GRAPH_ATTACHMENT_TYPE, graphAttachmentDefinition);
  attachments.addAttachmentType(
    SKILL_ATTACHMENT_TYPE,
    createSkillAttachmentDefinition({
      http: core.http,
      notifications: core.notifications,
      application: core.application,
      agents,
    })
  );
};
