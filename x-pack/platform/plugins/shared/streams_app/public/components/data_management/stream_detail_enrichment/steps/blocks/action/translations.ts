/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ADD_DESCRIPTION_MENU_LABEL = i18n.translate(
  'xpack.streams.streamDetailView.managementTab.enrichment.addDescriptionButtonText',
  {
    defaultMessage: 'Add description',
  }
);

export const EDIT_DESCRIPTION_MENU_LABEL = i18n.translate(
  'xpack.streams.streamDetailView.managementTab.enrichment.editDescriptionButtonText',
  {
    defaultMessage: 'Edit description',
  }
);

export const REMOVE_DESCRIPTION_MENU_LABEL = i18n.translate(
  'xpack.streams.streamDetailView.managementTab.enrichment.removeDescriptionButtonText',
  {
    defaultMessage: 'Remove description',
  }
);

export const DESCRIPTION_HELP_TEXT = i18n.translate(
  'xpack.streams.enrichment.processor.editDescription.helpText',
  {
    defaultMessage:
      'Explain this step, this would override the metadata. If you decide to remove the description, the metadata would appear back.',
  }
);

export const DESCRIPTION_FIELD_ARIA_LABEL = i18n.translate(
  'xpack.streams.enrichment.processor.editDescription.fieldAriaLabel',
  { defaultMessage: 'Processor description' }
);
