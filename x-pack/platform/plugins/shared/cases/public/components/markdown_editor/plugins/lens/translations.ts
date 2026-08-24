/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const VISUALIZATION = i18n.translate(
  'xpack.cases.markdownEditor.plugins.lens.visualizationButtonLabel',
  {
    defaultMessage: 'Visualization',
  }
);

export const SEARCH_INPUT_HELP_TEXT = i18n.translate(
  'xpack.cases.markdownEditor.plugins.lens.savedObjects.finder.searchInputHelpText',
  {
    defaultMessage:
      'Insert an existing Lens or create a new one. Any changes or new visualizations apply only to this comment.',
  }
);

export const SEARCH_INPUT_HELP_TEXT_WITH_ATTACH_HINT = i18n.translate(
  'xpack.cases.markdownEditor.plugins.lens.savedObjects.finder.searchInputHelpTextWithAttachHint',
  {
    defaultMessage:
      'Insert an existing Lens or create a new one. Any changes or new visualizations apply only to this comment. To add a visualization to the Attachments tab, select the Attach button.',
  }
);

export const FAILED_TO_LOAD_VISUALIZATION = i18n.translate(
  'xpack.cases.markdownEditor.plugins.lens.failedToLoadVisualization',
  {
    defaultMessage: 'Unable to load the saved visualization. It may have been deleted.',
  }
);
