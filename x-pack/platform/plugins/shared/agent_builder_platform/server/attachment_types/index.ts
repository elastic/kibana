/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentTypeDefinition } from '@kbn/onechat-server/attachments';
import type { CoreSetup } from '@kbn/core-lifecycle-server';
import { createTextAttachmentType } from './text';
import { createEsqlAttachmentType } from './esql';
import { createApplicationContextAttachmentType } from './app_context';
import { createTimerangeAttachmentType } from './timerange';
import type {
  AgentBuilderPlatformPluginStart,
  PluginSetupDependencies,
  PluginStartDependencies,
} from '../types';

export const registerAttachmentTypes = ({
  coreSetup,
  setupDeps,
}: {
  coreSetup: CoreSetup<PluginStartDependencies, AgentBuilderPlatformPluginStart>;
  setupDeps: PluginSetupDependencies;
}) => {
  const { onechat } = setupDeps;

  const attachmentTypes: AttachmentTypeDefinition<any, any>[] = [
    createTextAttachmentType(),
    createApplicationContextAttachmentType(),
    createEsqlAttachmentType(),
    createTimerangeAttachmentType(),
  ];

  attachmentTypes.forEach((attachmentType) => {
    onechat.attachments.registerType(attachmentType);
  });
};
