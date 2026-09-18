/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import {
  createNightshiftInvestigationsRepositoryClient,
  type NightshiftInvestigationsRepositoryClient,
} from './api';
import { registerInvestigationsWorkflowTriggers } from './workflows/triggers';
import { NIGHTSHIFT_INVESTIGATION_ATTACHMENT_TYPE } from '../common/investigation_attachment';

export interface NightshiftInvestigationsPublicSetupDeps {
  workflowsExtensions?: WorkflowsExtensionsPublicPluginSetup;
}

export interface NightshiftInvestigationsPublicStartDeps {
  agentBuilder?: AgentBuilderPluginStart;
}

export type NightshiftInvestigationsPublicSetup = void;

export interface NightshiftInvestigationsPublicStart {
  investigationsClient: NightshiftInvestigationsRepositoryClient;
}

export class NightshiftInvestigationsPublicPlugin
  implements Plugin<NightshiftInvestigationsPublicSetup, NightshiftInvestigationsPublicStart>
{
  setup(
    _core: CoreSetup,
    { workflowsExtensions }: NightshiftInvestigationsPublicSetupDeps
  ): NightshiftInvestigationsPublicSetup {
    registerInvestigationsWorkflowTriggers(workflowsExtensions);
  }

  start(
    core: CoreStart,
    { agentBuilder }: NightshiftInvestigationsPublicStartDeps
  ): NightshiftInvestigationsPublicStart {
    // Async so the Canvas renderer and its EUI/markdown dependencies stay off page load; it is
    // only needed once a conversation carrying an investigation attachment is opened.
    if (agentBuilder) {
      void import('./attachment_types/investigation_attachment').then(
        ({ investigationAttachmentDefinition }) => {
          agentBuilder.attachments.addAttachmentType(
            NIGHTSHIFT_INVESTIGATION_ATTACHMENT_TYPE,
            investigationAttachmentDefinition
          );
        }
      );
    }

    return {
      investigationsClient: createNightshiftInvestigationsRepositoryClient(core),
    };
  }
}
