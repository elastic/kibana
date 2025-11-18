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

export const VISIBLE_PRIVATE = i18n.translate(
  'xpack.elasticAssistant.assistant.visibility.visibleToYou',
  {
    defaultMessage: 'Only visible to you.',
  }
);

export const VISIBLE_SHARED = i18n.translate(
  'xpack.elasticAssistant.assistant.visibility.visibleShared',
  {
    defaultMessage: 'Visible to all space members.',
  }
);

export const VISIBLE_RESTRICTED = i18n.translate(
  'xpack.elasticAssistant.assistant.visibility.visibleRestricted',
  {
    defaultMessage: 'Only visible to selected space members.',
  }
);

export const RESTRICTED = i18n.translate('xpack.elasticAssistant.assistant.visibility.restricted', {
  defaultMessage: 'Restricted',
});

export const SHARE = i18n.translate('xpack.elasticAssistant.assistant.visibility.share', {
  defaultMessage: 'Share',
});

export const PRIVATE = i18n.translate('xpack.elasticAssistant.assistant.visibility.private', {
  defaultMessage: 'Private',
});

export const SHARED = i18n.translate('xpack.elasticAssistant.assistant.visibility.shared', {
  defaultMessage: 'Shared',
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
export const SELECT_USERS = i18n.translate(
  'xpack.elasticAssistant.assistant.visibility.shareUsers',
  {
    defaultMessage: 'Select users to share with',
  }
);

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

export const SHARED_SUCCESS = i18n.translate(
  'xpack.elasticAssistant.assistant.visibility.sharedSuccess',
  {
    defaultMessage: 'Successfully shared conversation with all users in the space',
  }
);

export const SHARED_ERROR = i18n.translate(
  'xpack.elasticAssistant.assistant.visibility.sharedError',
  {
    defaultMessage: 'Could not share conversation with all users in the space',
  }
);

export const RESTRICTED_SUCCESS = i18n.translate(
  'xpack.elasticAssistant.assistant.visibility.restrictedSuccess',
  {
    defaultMessage: 'Successfully shared conversation with selected users',
  }
);

export const RESTRICTED_ERROR = i18n.translate(
  'xpack.elasticAssistant.assistant.visibility.restrictedError',
  {
    defaultMessage: 'Could not share conversation with selected users',
  }
);
