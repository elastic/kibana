/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { CaseStatusCategory, CaseStatusDefinition } from '../../../../common/types/domain';

export const TITLE = i18n.translate('xpack.cases.configureCases.statuses.title', {
  defaultMessage: 'Statuses',
});

export const DESCRIPTION = i18n.translate('xpack.cases.configureCases.statuses.description', {
  defaultMessage: 'Choose the statuses cases move through. They apply to every case in this space.',
});

export const ADD_STATUS = i18n.translate('xpack.cases.configureCases.statuses.addStatus', {
  defaultMessage: 'Add status',
});

export const MAX_STATUSES = (max: number) =>
  i18n.translate('xpack.cases.configureCases.statuses.maxStatuses', {
    values: { max },
    defaultMessage: 'You can have up to {max} statuses.',
  });

export const DEFAULT_BADGE = i18n.translate('xpack.cases.configureCases.statuses.defaultBadge', {
  defaultMessage: 'Default',
});

export const DISABLED_STATUSES = (count: number) =>
  i18n.translate('xpack.cases.configureCases.statuses.disabledStatuses', {
    values: { count },
    defaultMessage: 'Disabled statuses ({count})',
  });

export const ACTIONS_FOR = (label: string) =>
  i18n.translate('xpack.cases.configureCases.statuses.actionsFor', {
    values: { label },
    defaultMessage: 'Actions for {label}',
  });

export const MOVE_UP = i18n.translate('xpack.cases.configureCases.statuses.moveUp', {
  defaultMessage: 'Move up',
});

export const MOVE_DOWN = i18n.translate('xpack.cases.configureCases.statuses.moveDown', {
  defaultMessage: 'Move down',
});

export const EDIT = i18n.translate('xpack.cases.configureCases.statuses.edit', {
  defaultMessage: 'Edit',
});

export const SET_AS_DEFAULT = i18n.translate('xpack.cases.configureCases.statuses.setAsDefault', {
  defaultMessage: 'Set as default',
});

export const DISABLE = i18n.translate('xpack.cases.configureCases.statuses.disable', {
  defaultMessage: 'Disable',
});

export const ENABLE = i18n.translate('xpack.cases.configureCases.statuses.enable', {
  defaultMessage: 'Enable',
});

export const CANNOT_DISABLE_DEFAULT = i18n.translate(
  'xpack.cases.configureCases.statuses.cannotDisableDefault',
  {
    defaultMessage: 'Set another status as the default first.',
  }
);

export const ENABLE_FIRST = i18n.translate('xpack.cases.configureCases.statuses.enableFirst', {
  defaultMessage: 'Enable this status first.',
});

export const SAVE_ERROR_TITLE = i18n.translate(
  'xpack.cases.configureCases.statuses.saveErrorTitle',
  {
    defaultMessage: "Couldn't save statuses",
  }
);

export const ADD_STATUS_TITLE = i18n.translate(
  'xpack.cases.configureCases.statuses.addStatusTitle',
  {
    defaultMessage: 'Add status',
  }
);

export const EDIT_STATUS_TITLE = i18n.translate(
  'xpack.cases.configureCases.statuses.editStatusTitle',
  {
    defaultMessage: 'Edit status',
  }
);

export const NAME = i18n.translate('xpack.cases.configureCases.statuses.name', {
  defaultMessage: 'Name',
});

export const COLOR = i18n.translate('xpack.cases.configureCases.statuses.color', {
  defaultMessage: 'Color',
});

export const CATEGORY = i18n.translate('xpack.cases.configureCases.statuses.category', {
  defaultMessage: 'When a case is in this status, treat it as:',
});

export const CATEGORY_LOCKED = i18n.translate(
  'xpack.cases.configureCases.statuses.categoryLocked',
  {
    defaultMessage: "This can't change after the status is created.",
  }
);

export const KEY = i18n.translate('xpack.cases.configureCases.statuses.key', {
  defaultMessage: 'Key',
});

export const KEY_HELP = i18n.translate('xpack.cases.configureCases.statuses.keyHelp', {
  defaultMessage: "Use this key to set the status through the API. It can't change.",
});

export const NAME_REQUIRED = i18n.translate('xpack.cases.configureCases.statuses.nameRequired', {
  defaultMessage: 'Enter a name.',
});

export const NAME_TAKEN = i18n.translate('xpack.cases.configureCases.statuses.nameTaken', {
  defaultMessage: 'Another status already uses this name.',
});

export const NAME_TOO_LONG = (max: number) =>
  i18n.translate('xpack.cases.configureCases.statuses.nameTooLong', {
    values: { max },
    defaultMessage: 'Names can be up to {max} characters.',
  });

export const NAME_PLACEHOLDER = i18n.translate(
  'xpack.cases.configureCases.statuses.namePlaceholder',
  {
    defaultMessage: 'Status',
  }
);

export const SAVE = i18n.translate('xpack.cases.configureCases.statuses.save', {
  defaultMessage: 'Save',
});

export const CANCEL = i18n.translate('xpack.cases.configureCases.statuses.cancel', {
  defaultMessage: 'Cancel',
});

export const CATEGORY_LABELS: Record<CaseStatusCategory, string> = {
  not_started: i18n.translate('xpack.cases.configureCases.statuses.category.notStarted', {
    defaultMessage: 'Not started',
  }),
  active: i18n.translate('xpack.cases.configureCases.statuses.category.active', {
    defaultMessage: 'Active',
  }),
  done: i18n.translate('xpack.cases.configureCases.statuses.category.done', {
    defaultMessage: 'Done',
  }),
};

export const COLOR_LABELS: Record<CaseStatusDefinition['color'], string> = {
  default: i18n.translate('xpack.cases.configureCases.statuses.color.default', {
    defaultMessage: 'Gray',
  }),
  hollow: i18n.translate('xpack.cases.configureCases.statuses.color.hollow', {
    defaultMessage: 'Outline',
  }),
  primary: i18n.translate('xpack.cases.configureCases.statuses.color.primary', {
    defaultMessage: 'Blue',
  }),
  accent: i18n.translate('xpack.cases.configureCases.statuses.color.accent', {
    defaultMessage: 'Pink',
  }),
  success: i18n.translate('xpack.cases.configureCases.statuses.color.success', {
    defaultMessage: 'Green',
  }),
  warning: i18n.translate('xpack.cases.configureCases.statuses.color.warning', {
    defaultMessage: 'Yellow',
  }),
  danger: i18n.translate('xpack.cases.configureCases.statuses.color.danger', {
    defaultMessage: 'Red',
  }),
};

export const PICK_COLOR = (color: string) =>
  i18n.translate('xpack.cases.configureCases.statuses.pickColor', {
    values: { color },
    defaultMessage: 'Use {color}',
  });

export const SELECTED_COLOR = (color: string) =>
  i18n.translate('xpack.cases.configureCases.statuses.selectedColor', {
    values: { color },
    defaultMessage: '{color}, selected',
  });
