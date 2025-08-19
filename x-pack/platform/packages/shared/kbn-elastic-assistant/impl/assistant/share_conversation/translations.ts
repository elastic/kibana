/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const VISIBILITY = i18n.translate('xpack.elasticAssistant.assistant.visibility.title', {
  defaultMessage: 'Visibility',
});

export const ONLY_VISIBLE_TO_YOU = i18n.translate(
  'xpack.elasticAssistant.assistant.visibility.visibleToYou',
  {
    defaultMessage: 'This conversation is only visible to you.',
  }
);

export const VISIBLE_GLOBAL = i18n.translate(
  'xpack.elasticAssistant.assistant.visibility.visibleGlobal',
  {
    defaultMessage: 'All team members can view this conversation.',
  }
);

export const VISIBLE_SELECTED = i18n.translate(
  'xpack.elasticAssistant.assistant.visibility.visibleSelected',
  {
    defaultMessage: 'Selected team members can view this conversation.',
  }
);

export const SHARED = i18n.translate('xpack.elasticAssistant.assistant.visibility.shared', {
  defaultMessage: 'Shared',
});

export const SHARE = i18n.translate('xpack.elasticAssistant.assistant.visibility.share', {
  defaultMessage: 'Share',
});

export const PRIVATE = i18n.translate('xpack.elasticAssistant.assistant.visibility.private', {
  defaultMessage: 'Private',
});

export const GLOBAL = i18n.translate('xpack.elasticAssistant.assistant.visibility.global', {
  defaultMessage: 'Global',
});
export const SELECT_VISIBILITY_ARIA_LABEL = i18n.translate(
  'xpack.elasticAssistant.assistant.visibility.selectVisibilityAriaLabel',
  {
    defaultMessage: 'Select visibility',
  }
);

export const ERROR_SUGGEST = i18n.translate(
  'xpack.elasticAssistant.assistant.visibility.inputPlaceholder',
  {
    defaultMessage: 'An error occurred while fetching user suggestions.',
  }
);
export const ADD = i18n.translate('xpack.elasticAssistant.assistant.visibility.add', {
  defaultMessage: 'Add',
});
export const DONE = i18n.translate('xpack.elasticAssistant.assistant.visibility.done', {
  defaultMessage: 'Done',
});

export const PRIVATE_SUCCESS = i18n.translate(
  'xpack.elasticAssistant.assistant.visibility.privateSuccess',
  {
    defaultMessage: 'Successfully set conversation to private',
  }
);

export const PRIVATE_ERROR = i18n.translate(
  'xpack.elasticAssistant.assistant.visibility.privateError',
  {
    defaultMessage: 'Could not set conversation to private',
  }
);

export const GLOBAL_SUCCESS = i18n.translate(
  'xpack.elasticAssistant.assistant.visibility.privateSuccess',
  {
    defaultMessage: 'Successfully shared conversation globally',
  }
);

export const GLOBAL_ERROR = i18n.translate(
  'xpack.elasticAssistant.assistant.visibility.privateError',
  {
    defaultMessage: 'Could not share conversation globally',
  }
);
