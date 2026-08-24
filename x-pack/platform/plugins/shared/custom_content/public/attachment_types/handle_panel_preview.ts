/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { CustomContentContextAttachmentData } from '../../common/panel_context_attachment';
import { previewPanelVersion } from '../utils/panel_preview_registry';
import { getServices } from '../services';

/**
 * Applies an attachment version to its panel. Lazy-loaded from the action button so the registry,
 * services and warning copy stay out of the plugin's page-load bundle.
 */
export const handlePanelPreview = (data: CustomContentContextAttachmentData): void => {
  if (previewPanelVersion(data)) return;

  getServices().core.notifications.toasts.addWarning({
    title: i18n.translate('xpack.customContent.agentRefine.panelUnavailableTitle', {
      defaultMessage: 'Panel is no longer open',
    }),
    text: i18n.translate('xpack.customContent.agentRefine.panelUnavailableText', {
      defaultMessage: 'Open the dashboard containing this panel to preview this version.',
    }),
  });
};
