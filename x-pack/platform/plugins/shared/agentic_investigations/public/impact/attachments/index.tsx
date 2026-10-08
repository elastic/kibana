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
import { registerInvestigationAttachmentRenderer } from '../../investigation_attachments';
import { impactAttachmentRenderer } from './impact_attachment_definition';
import { ImpactView } from './impact_view';

/** Registers the Impact flyout/inline renderer with Agent Builder and the overview section. */
export const registerImpactAttachmentTypes = (agentBuilder: AgentBuilderPluginStart): void => {
  registerImpactDetailsRenderer((data) => (
    <ImpactView document={data as Impact} variant="details" />
  ));
  registerInvestigationAttachmentRenderer(agentBuilder, impactAttachmentRenderer);
};
