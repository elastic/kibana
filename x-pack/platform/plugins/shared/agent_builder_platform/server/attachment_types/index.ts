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
import { createScreenContextAttachmentType } from './screen_context';
import { createProductReferenceAttachmentType } from './product_reference';
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
    createScreenContextAttachmentType(),
    createEsqlAttachmentType(),
    createProductReferenceAttachmentType(),
  ];

  attachmentTypes.forEach((attachmentType) => {
    onechat.attachments.registerType(attachmentType);
  });
};
