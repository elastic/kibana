/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ADD_TO_DATASET_POPOVER_TITLE = (messageCount: number) =>
  i18n.translate('xpack.elasticAssistant.assistant.evaluation.addToDataset.popoverTitle', {
    values: { messageCount },
    defaultMessage: 'Add {messageCount} messages to dataset',
  });

export const ADD_TO_DATASET_POPOVER_DESCRIPTION = i18n.translate(
  'xpack.elasticAssistant.assistant.evaluation.addToDataset.popoverDescription',
  {
    defaultMessage:
      'Datasets are populated from both the `.kibana-elastic-ai-assistant-datasets` index, and LangSmith (if configured).',
  }
);

export const ADD_TO_DATASET_BUTTON = i18n.translate(
  'xpack.elasticAssistant.assistant.evaluation.addToDataset.buttonTitle',
  {
    defaultMessage: 'Add to dataset',
  }
);

export const DATASET_COMBO_BOX_LABEL = i18n.translate(
  'xpack.elasticAssistant.assistant.evaluation.addToDataset.datasetComboBoxLabel',
  {
    defaultMessage: 'Dataset',
  }
);

export const DATASET_COMBO_BOX_LABEL_CUSTOM_OPTION = i18n.translate(
  'xpack.elasticAssistant.assistant.evaluation.addToDataset.datasetComboBoxCustomOptionLabel',
  {
    defaultMessage: 'Add \\{searchValue\\} as a new dataset',
  }
);

export const DATASET_COMBO_BOX_HELP_TEXT = i18n.translate(
  'xpack.elasticAssistant.assistant.evaluation.addToDataset.datasetComboBoxHelpText',
  {
    defaultMessage: 'Select or type to create new...',
  }
);
