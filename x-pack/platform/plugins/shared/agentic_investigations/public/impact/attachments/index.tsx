/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import { registerImpactDetailsRenderer } from '@kbn/agentic-investigations-common';
import type { Impact } from '../../../common/impact/impact';
import type { ImpactEntityOpener } from '../../types';
import { registerInvestigationAttachmentRenderer } from '../../investigation_attachments';
import { impactAttachmentRenderer } from './impact_attachment_definition';
import { ImpactView } from './impact_view';

/**
 * Registers the Impact flyout/inline renderer with Agent Builder and the overview section.
 * `getImpactEntityOpener` is read when the overview renders, so a solution can register the
 * opener from its own start, after this plugin has started.
 */
export const registerImpactAttachmentTypes = (
  agentBuilder: AgentBuilderPluginStart,
  getImpactEntityOpener: () => ImpactEntityOpener | undefined
): void => {
  registerImpactDetailsRenderer((data) => (
    <ImpactView
      document={data as Impact}
      variant="details"
      onOpenEntity={getImpactEntityOpener()}
    />
  ));
  registerInvestigationAttachmentRenderer(agentBuilder, impactAttachmentRenderer);
};
