/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import type { ResolveMlCapabilities } from '@kbn/ml-common-types/capabilities';
import type { MlLicense } from '../../common/license';
import type { MlFeatures } from '../../common/constants/app';
import type { MlAuthorizationService } from '../lib/capabilities/check_capabilities';
import type { MlClientFactoryDeps } from './ml_client_factory';
import { createMlClientFactory } from './ml_client_factory';
import {
  createDfaScatterplotMatrixAttachmentType,
  createDfaTotalFeatureImportanceAttachmentType,
} from './attachment_types';
import { createDataFrameAnalyticsSkill } from './skills/data_frame_analytics';

export const registerDataFrameAnalyticsAgentBuilder = ({
  agentBuilder,
  resolveMlCapabilities,
  authorization,
  mlLicense,
  enabledFeatures,
  mlClientFactoryDeps,
}: {
  agentBuilder: AgentBuilderPluginSetup;
  resolveMlCapabilities: ResolveMlCapabilities;
  authorization?: MlAuthorizationService;
  mlLicense?: MlLicense;
  enabledFeatures?: MlFeatures;
  mlClientFactoryDeps: MlClientFactoryDeps;
}): void => {
  const buildMlClient = createMlClientFactory(mlClientFactoryDeps);

  agentBuilder.attachments.registerType(
    createDfaTotalFeatureImportanceAttachmentType() as AttachmentTypeDefinition
  );
  agentBuilder.attachments.registerType(
    createDfaScatterplotMatrixAttachmentType() as AttachmentTypeDefinition
  );

  agentBuilder.skills.register(
    createDataFrameAnalyticsSkill({
      resolveMlCapabilities,
      authorization,
      mlLicense,
      enabledFeatures,
      buildMlClient,
      getDataViews: mlClientFactoryDeps.getDataViews,
    })
  );
};
