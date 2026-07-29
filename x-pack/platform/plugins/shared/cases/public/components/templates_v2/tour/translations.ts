/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const START_TOUR = i18n.translate('xpack.cases.templates.tour.start', {
  defaultMessage: 'Start tour',
});

export const STEP_CREATE_TITLE = i18n.translate('xpack.cases.templates.tour.create.title', {
  defaultMessage: 'Create custom templates',
});

export const STEP_CREATE_DESCRIPTION = i18n.translate(
  'xpack.cases.templates.tour.create.description',
  {
    defaultMessage:
      'Define a set of field definitions and default case values that populate automatically when a case is created from the template.',
  }
);

export const STEP_FIELD_LIBRARY_TITLE = i18n.translate(
  'xpack.cases.templates.tour.fieldLibrary.title',
  {
    defaultMessage: 'Reuse fields from the Field Library',
  }
);

export const STEP_FIELD_LIBRARY_DESCRIPTION = i18n.translate(
  'xpack.cases.templates.tour.fieldLibrary.description',
  {
    defaultMessage:
      'Add reusable field definitions here. Global fields apply to every case, whether or not a template is applied.',
  }
);

export const EDITOR_STEP_YAML_TITLE = i18n.translate(
  'xpack.cases.templates.editorTour.yaml.title',
  {
    defaultMessage: 'Edit as YAML',
  }
);

export const EDITOR_STEP_YAML_DESCRIPTION = i18n.translate(
  'xpack.cases.templates.editorTour.yaml.description',
  {
    defaultMessage: "Define your template's fields and case defaults directly in YAML.",
  }
);

export const EDITOR_STEP_PREVIEW_TITLE = i18n.translate(
  'xpack.cases.templates.editorTour.preview.title',
  {
    defaultMessage: 'Live preview',
  }
);

export const EDITOR_STEP_PREVIEW_DESCRIPTION = i18n.translate(
  'xpack.cases.templates.editorTour.preview.description',
  {
    defaultMessage:
      'See your changes rendered live, with collapsible panels for case defaults and custom fields.',
  }
);

export const EDITOR_STEP_ACTIONS_TITLE = i18n.translate(
  'xpack.cases.templates.editorTour.actions.title',
  {
    defaultMessage: 'Template actions',
  }
);

export const EDITOR_STEP_ACTIONS_DESCRIPTION = i18n.translate(
  'xpack.cases.templates.editorTour.actions.description',
  {
    defaultMessage:
      'Add new field definitions, insert from the field library, and add validation logic here.',
  }
);

export const EDITOR_STEP_CONFIG_TITLE = i18n.translate(
  'xpack.cases.templates.editorTour.config.title',
  {
    defaultMessage: 'Configuration',
  }
);

export const EDITOR_STEP_CONFIG_DESCRIPTION = i18n.translate(
  'xpack.cases.templates.editorTour.config.description',
  {
    defaultMessage:
      "Set the template's details and default configuration, such as connector and sync settings.",
  }
);
