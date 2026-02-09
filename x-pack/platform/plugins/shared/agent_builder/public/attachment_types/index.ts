/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { AgentBuilderStartDependencies } from '../types';
import type { AttachmentsService } from '../services';
import { createVisualizationAttachmentRenderer } from '../application/components/attachments/visualization_attachment_renderer';

export const registerAttachmentUiDefinitions = ({
  attachmentsService,
  startDependencies,
}: {
  attachmentsService: AttachmentsService;
  startDependencies: AgentBuilderStartDependencies;
}) => {
  attachmentsService.addAttachmentType('visualization', {
    getLabel: () =>
      i18n.translate('xpack.agentBuilder.attachments.visualization.label', {
        defaultMessage: 'Visualization',
      }),
    getIcon: () => 'visArea',
    renderContent: createVisualizationAttachmentRenderer(startDependencies),
  });
};
