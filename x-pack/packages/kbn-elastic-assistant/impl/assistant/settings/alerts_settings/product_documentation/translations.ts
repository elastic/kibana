/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const LABEL = i18n.translate('xpack.elasticAssistant.assistant.settings.productDocLabel', {
  defaultMessage: 'Elastic documentation',
});
export const DESCRIPTION = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.productDocDescription',
  {
    defaultMessage: "Install Elastic documentation to improve the assistant's efficiency.",
  }
);

export const OPEN_CONFIRM_TEXT = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.productDocUninstallConfirmText',
  {
    defaultMessage: `Are you sure you want to uninstall the Elastic documentation?`,
  }
);

export const OPEN_CONFIRM_TITLE = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.productDocUninstallConfirmTitle',
  {
    defaultMessage: `Uninstalling Elastic documentation`,
  }
);

export const INSTALL = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.installProductDocButtonLabel',
  { defaultMessage: 'Install' }
);

export const INSTALLING = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.installingText',
  { defaultMessage: 'Installing...' }
);

export const INSTALLED = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.installProductDocInstalledLabel',
  { defaultMessage: 'Installed' }
);

export const UNINSTALL = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.uninstallProductDocButtonLabel',
  { defaultMessage: 'Uninstall' }
);
