/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SPACES_LABEL = i18n.translate('xpack.evals.datasetSpaces.label', {
  defaultMessage: 'Spaces',
});

export const SPACES_HELP_TEXT = i18n.translate('xpack.evals.datasetSpaces.helpText', {
  defaultMessage:
    'Where this dataset can be found. Defaults to the current space. You need permission to manage evaluations in every space you add.',
});

export const SPACES_PLACEHOLDER = i18n.translate('xpack.evals.datasetSpaces.placeholder', {
  defaultMessage: 'Select spaces',
});

export const getCurrentSpaceOption = (name: string) =>
  i18n.translate('xpack.evals.datasetSpaces.currentSpaceOption', {
    defaultMessage: '{name} (current)',
    values: { name },
  });

export const getSharedBadge = (count: number) =>
  i18n.translate('xpack.evals.datasetSpaces.sharedBadge', {
    defaultMessage: '{count, plural, one {# space} other {# spaces}}',
    values: { count },
  });

export const getSharedTooltip = (spaceNames: string[]) =>
  i18n.translate('xpack.evals.datasetSpaces.sharedTooltip', {
    defaultMessage: 'Also in {spaceNames}',
    values: { spaceNames: spaceNames.join(', ') },
  });

export const getHiddenSpacesTooltip = (count: number) =>
  i18n.translate('xpack.evals.datasetSpaces.hiddenSpacesTooltip', {
    defaultMessage:
      'Also in {count, plural, one {# space} other {# spaces}} you do not have access to',
    values: { count },
  });

export const getHiddenSpacesHelpText = (count: number) =>
  i18n.translate('xpack.evals.datasetSpaces.hiddenSpacesHelpText', {
    defaultMessage:
      'This dataset is also in {count, plural, one {# space} other {# spaces}} you cannot see. {count, plural, one {It stays} other {They stay}} assigned.',
    values: { count },
  });

export const SHARED_NOTICE_TITLE = i18n.translate('xpack.evals.datasetSpaces.sharedNoticeTitle', {
  defaultMessage: 'This dataset is shared',
});

export const getSpaceCountScope = (count: number) =>
  i18n.translate('xpack.evals.datasetSpaces.spaceCountScope', {
    defaultMessage:
      '{count, plural, one {the # space} other {the # spaces}} this dataset is shared with',
    values: { count },
  });

export const getEditDatasetNotice = (scope: string) =>
  i18n.translate('xpack.evals.datasetSpaces.editDatasetNotice', {
    defaultMessage: 'Changes here apply in {scope}.',
    values: { scope },
  });

export const getAddExampleNotice = (scope: string) =>
  i18n.translate('xpack.evals.datasetSpaces.addExampleNotice', {
    defaultMessage: 'This example will be visible in {scope}.',
    values: { scope },
  });

export const getEditExampleNotice = (scope: string) =>
  i18n.translate('xpack.evals.datasetSpaces.editExampleNotice', {
    defaultMessage: 'Changes to this example apply in {scope}.',
    values: { scope },
  });

export const getDeleteExampleNotice = (scope: string) =>
  i18n.translate('xpack.evals.datasetSpaces.deleteExampleNotice', {
    defaultMessage: 'This example will be deleted from {scope}.',
    values: { scope },
  });

export const CONFIRM_EDIT_DATASET_TITLE = i18n.translate(
  'xpack.evals.datasetSpaces.confirmEditDatasetTitle',
  {
    defaultMessage: 'Save changes to a shared dataset?',
  }
);

export const CONFIRM_EDIT_EXAMPLE_TITLE = i18n.translate(
  'xpack.evals.datasetSpaces.confirmEditExampleTitle',
  {
    defaultMessage: 'Save changes to a shared dataset?',
  }
);

export const CONFIRM_REMOVE_SPACES_TITLE = i18n.translate(
  'xpack.evals.datasetSpaces.confirmRemoveSpacesTitle',
  {
    defaultMessage: 'Remove this dataset from other spaces?',
  }
);

export const REMOVED_SPACES_TITLE = i18n.translate('xpack.evals.datasetSpaces.removedSpacesTitle', {
  defaultMessage: 'Some spaces will lose this dataset',
});

export const getRemovedSpacesMessage = (spaceNames: string[]) =>
  i18n.translate('xpack.evals.datasetSpaces.removedSpacesMessage', {
    defaultMessage:
      'It will no longer appear in {spaceNames}. Its examples are kept, and you can add {spaceCount, plural, one {the space} other {those spaces}} back later.',
    values: { spaceNames: spaceNames.join(', '), spaceCount: spaceNames.length },
  });

export const CONFIRM_SAVE_BUTTON = i18n.translate('xpack.evals.datasetSpaces.confirmSaveButton', {
  defaultMessage: 'Save changes',
});

export const CONFIRM_CANCEL_BUTTON = i18n.translate(
  'xpack.evals.datasetSpaces.confirmCancelButton',
  {
    defaultMessage: 'Cancel',
  }
);
