/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const FLYOUT_TITLE = i18n.translate('xpack.cases.investigations.create.flyoutTitle', {
  defaultMessage: 'New investigation',
});
export const FLYOUT_SUBTITLE = i18n.translate('xpack.cases.investigations.create.flyoutSubtitle', {
  defaultMessage:
    'Describe what you are looking into. People and agents work from this record, so a clear title and description help.',
});

export const TITLE_LABEL = i18n.translate('xpack.cases.investigations.create.titleLabel', {
  defaultMessage: 'Title',
});
export const TITLE_PLACEHOLDER = i18n.translate(
  'xpack.cases.investigations.create.titlePlaceholder',
  {
    defaultMessage: 'Example: Suspicious sign-in from a new country',
  }
);
export const TITLE_REQUIRED = i18n.translate('xpack.cases.investigations.create.titleRequired', {
  defaultMessage: 'Enter a title.',
});
export const TITLE_TOO_LONG = (max: number) =>
  i18n.translate('xpack.cases.investigations.create.titleTooLong', {
    defaultMessage: 'The title can be at most {max} characters.',
    values: { max },
  });

export const DESCRIPTION_LABEL = i18n.translate(
  'xpack.cases.investigations.create.descriptionLabel',
  {
    defaultMessage: 'Description',
  }
);
export const DESCRIPTION_HELP = i18n.translate(
  'xpack.cases.investigations.create.descriptionHelp',
  {
    defaultMessage: 'Markdown is supported.',
  }
);
export const DESCRIPTION_REQUIRED = i18n.translate(
  'xpack.cases.investigations.create.descriptionRequired',
  { defaultMessage: 'Enter a description.' }
);
export const DESCRIPTION_TOO_LONG = (max: number) =>
  i18n.translate('xpack.cases.investigations.create.descriptionTooLong', {
    defaultMessage: 'The description can be at most {max} characters.',
    values: { max },
  });

export const TYPE_LABEL = i18n.translate('xpack.cases.investigations.create.typeLabel', {
  defaultMessage: 'Investigation type',
});
export const TYPE_HELP = i18n.translate('xpack.cases.investigations.create.typeHelp', {
  defaultMessage: 'The type sets the procedure and its required tasks.',
});
export const TYPE_REQUIRED = i18n.translate('xpack.cases.investigations.create.typeRequired', {
  defaultMessage: 'Choose an investigation type.',
});
export const TYPE_PLACEHOLDER = i18n.translate(
  'xpack.cases.investigations.create.typePlaceholder',
  {
    defaultMessage: 'Select a type',
  }
);
export const TYPES_NONE = i18n.translate('xpack.cases.investigations.create.typesNone', {
  defaultMessage: 'There are no investigation types yet. Add one on the Cases templates page.',
});
export const TYPES_ERROR = i18n.translate('xpack.cases.investigations.create.typesError', {
  defaultMessage: 'Could not load the investigation types.',
});

export const PRIORITY_LABEL = i18n.translate('xpack.cases.investigations.create.priorityLabel', {
  defaultMessage: 'Priority',
});
export const TAGS_LABEL = i18n.translate('xpack.cases.investigations.create.tagsLabel', {
  defaultMessage: 'Tags',
});
export const TAGS_PLACEHOLDER = i18n.translate(
  'xpack.cases.investigations.create.tagsPlaceholder',
  {
    defaultMessage: 'Type a tag and press Enter',
  }
);
export const TAG_TOO_LONG = (max: number) =>
  i18n.translate('xpack.cases.investigations.create.tagTooLong', {
    defaultMessage: 'A tag can be at most {max} characters.',
    values: { max },
  });
export const TOO_MANY_TAGS = (max: number) =>
  i18n.translate('xpack.cases.investigations.create.tooManyTags', {
    defaultMessage: 'An investigation can have at most {max} tags.',
    values: { max },
  });

export const TYPE_FIELDS_SECTION = (type: string) =>
  i18n.translate('xpack.cases.investigations.create.typeFieldsSection', {
    defaultMessage: '{type} details',
    values: { type },
  });
export const ENTITIES_LABEL = i18n.translate('xpack.cases.investigations.create.entitiesLabel', {
  defaultMessage: 'Hosts and users involved',
});
export const ENTITIES_HELP = i18n.translate('xpack.cases.investigations.create.entitiesHelp', {
  defaultMessage:
    'Optional. Used to check whether someone is already investigating the same thing.',
});
export const ENTITIES_PLACEHOLDER = i18n.translate(
  'xpack.cases.investigations.create.entitiesPlaceholder',
  {
    defaultMessage: 'Type a host or user name and press Enter',
  }
);
export const ALERT_IDS_LABEL = i18n.translate('xpack.cases.investigations.create.alertIdsLabel', {
  defaultMessage: 'Alert IDs',
});
export const ALERT_IDS_HELP = i18n.translate('xpack.cases.investigations.create.alertIdsHelp', {
  defaultMessage: 'Optional. Used to check whether these alerts are already in an investigation.',
});
export const ALERT_IDS_PLACEHOLDER = i18n.translate(
  'xpack.cases.investigations.create.alertIdsPlaceholder',
  {
    defaultMessage: 'Paste an alert ID and press Enter',
  }
);

export const AI_LABEL = i18n.translate('xpack.cases.investigations.create.aiLabel', {
  defaultMessage: 'Use an agent on this investigation',
});
export const AI_HELP = i18n.translate('xpack.cases.investigations.create.aiHelp', {
  defaultMessage:
    'The agent can add evidence, raise claims and propose actions. People approve its actions.',
});
export const AI_UNAVAILABLE = i18n.translate('xpack.cases.investigations.create.aiUnavailable', {
  defaultMessage: 'Agents are not available here, so the investigation is created without one.',
});

export const CHECKING_DUPLICATES = i18n.translate(
  'xpack.cases.investigations.create.checkingDuplicates',
  {
    defaultMessage: 'Checking for similar investigations',
  }
);
export const DUPLICATES_TITLE = (count: number) =>
  i18n.translate('xpack.cases.investigations.create.duplicatesTitle', {
    defaultMessage:
      '{count, plural, one {# similar investigation already exists} other {# similar investigations already exist}}',
    values: { count },
  });
export const DUPLICATES_BODY = i18n.translate('xpack.cases.investigations.create.duplicatesBody', {
  defaultMessage:
    'Open one of them instead of starting another. If this is a different incident, you can still create it.',
});
export const DUPLICATE_OPEN = i18n.translate('xpack.cases.investigations.create.duplicateOpen', {
  defaultMessage: 'Open',
});
export const DUPLICATE_STATUS_OPEN = i18n.translate(
  'xpack.cases.investigations.create.duplicateStatusOpen',
  {
    defaultMessage: 'Open',
  }
);
export const DUPLICATE_STATUS_IN_PROGRESS = i18n.translate(
  'xpack.cases.investigations.create.duplicateStatusInProgress',
  { defaultMessage: 'In progress' }
);
export const DUPLICATE_STATUS_CLOSED = i18n.translate(
  'xpack.cases.investigations.create.duplicateStatusClosed',
  {
    defaultMessage: 'Closed',
  }
);
export const DUPLICATE_WHY = (reasons: string) =>
  i18n.translate('xpack.cases.investigations.create.duplicateWhy', {
    defaultMessage: 'Why: {reasons}',
    values: { reasons },
  });
export const DUPLICATE_CHECK_ERROR = i18n.translate(
  'xpack.cases.investigations.create.duplicateCheckError',
  {
    defaultMessage: 'Could not check for similar investigations. You can still create this one.',
  }
);

export const CREATE = i18n.translate('xpack.cases.investigations.create.create', {
  defaultMessage: 'Create investigation',
});
export const CREATE_ANYWAY = i18n.translate('xpack.cases.investigations.create.createAnyway', {
  defaultMessage: 'Create anyway',
});
export const CANCEL = i18n.translate('xpack.cases.investigations.create.cancel', {
  defaultMessage: 'Cancel',
});
export const FORM_INVALID = i18n.translate('xpack.cases.investigations.create.formInvalid', {
  defaultMessage: 'Fix the highlighted fields to continue.',
});

export const DISCARD_TITLE = i18n.translate('xpack.cases.investigations.create.discardTitle', {
  defaultMessage: 'Discard this investigation?',
});
export const DISCARD_BODY = i18n.translate('xpack.cases.investigations.create.discardBody', {
  defaultMessage: 'What you entered will be lost.',
});
export const DISCARD_CONFIRM = i18n.translate('xpack.cases.investigations.create.discardConfirm', {
  defaultMessage: 'Discard',
});
export const DISCARD_KEEP_EDITING = i18n.translate(
  'xpack.cases.investigations.create.discardKeepEditing',
  {
    defaultMessage: 'Keep editing',
  }
);
