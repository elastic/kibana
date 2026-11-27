/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/**
 * Field labels
 */

export const TITLE = i18n.translate('xpack.cases.mergeCases.differences.field.title', {
  defaultMessage: 'Title',
});
export const DESCRIPTION = i18n.translate('xpack.cases.mergeCases.differences.field.description', {
  defaultMessage: 'Description',
});
export const SEVERITY = i18n.translate('xpack.cases.mergeCases.differences.field.severity', {
  defaultMessage: 'Severity',
});
export const CATEGORY = i18n.translate('xpack.cases.mergeCases.differences.field.category', {
  defaultMessage: 'Category',
});
export const CONNECTOR = i18n.translate('xpack.cases.mergeCases.differences.field.connector', {
  defaultMessage: 'Connector',
});
export const TEMPLATE = i18n.translate('xpack.cases.mergeCases.differences.field.template', {
  defaultMessage: 'Template',
});
export const TAGS = i18n.translate('xpack.cases.mergeCases.differences.field.tags', {
  defaultMessage: 'Tags',
});
export const ASSIGNEES = i18n.translate('xpack.cases.mergeCases.differences.field.assignees', {
  defaultMessage: 'Assignees',
});

/**
 * Field states
 */

export const STATE_CHOOSE_ONE = i18n.translate(
  'xpack.cases.mergeCases.differences.state.chooseOne',
  {
    defaultMessage: 'Choose one',
  }
);
export const STATE_CHOSEN = i18n.translate('xpack.cases.mergeCases.differences.state.chosen', {
  defaultMessage: 'Your choice',
});
export const STATE_AI_CHOSE = i18n.translate('xpack.cases.mergeCases.differences.state.aiChose', {
  defaultMessage: 'Chosen by AI',
});
export const STATE_AI_WROTE = i18n.translate('xpack.cases.mergeCases.differences.state.aiWrote', {
  defaultMessage: 'Written by AI',
});
export const STATE_OWN = i18n.translate('xpack.cases.mergeCases.differences.state.own', {
  defaultMessage: 'Your value',
});
export const STATE_NOT_VALID = i18n.translate('xpack.cases.mergeCases.differences.state.notValid', {
  defaultMessage: 'Not valid',
});
export const STATE_NOT_VALID_FOR = (template: string) =>
  i18n.translate('xpack.cases.mergeCases.differences.state.notValidFor', {
    values: { template },
    defaultMessage: 'Not valid for {template}',
  });
export const STATE_REQUIRED = i18n.translate('xpack.cases.mergeCases.differences.state.required', {
  defaultMessage: 'Required',
});
export const STATE_REQUIRED_BY = (template: string) =>
  i18n.translate('xpack.cases.mergeCases.differences.state.requiredBy', {
    values: { template },
    defaultMessage: 'Required by {template}',
  });
export const STATE_REMOVE = (count: number) =>
  i18n.translate('xpack.cases.mergeCases.differences.state.remove', {
    values: { count },
    defaultMessage: 'Remove {count}',
  });
export const STATE_SHORTEN = (count: number) =>
  i18n.translate('xpack.cases.mergeCases.differences.state.shorten', {
    values: { count },
    defaultMessage: 'Shorten by {count, number}',
  });
export const STATE_COMBINED = (count: number) =>
  i18n.translate('xpack.cases.mergeCases.differences.state.combined', {
    values: { count },
    defaultMessage: 'Combined from {count, plural, one {# case} other {# cases}}',
  });
export const STATE_LOCKED = i18n.translate('xpack.cases.mergeCases.differences.state.locked', {
  defaultMessage: "Can't change",
});

/**
 * Step
 */

export const NO_DIFFERENCES = i18n.translate('xpack.cases.mergeCases.differences.noDifferences', {
  defaultMessage: 'Every field is the same in all cases. There is nothing to choose.',
});
export const FILL_FROM_CASE = i18n.translate('xpack.cases.mergeCases.differences.fillFrom.button', {
  defaultMessage: 'Fill from a case',
});
export const FILL_FROM_CASE_HELP = (count: number) =>
  i18n.translate('xpack.cases.mergeCases.differences.fillFrom.help', {
    values: { count },
    defaultMessage:
      "{count, plural, one {Replaces the field that differs with one case's value.} other {Replaces all # fields that differ with one case's values.}}",
  });
export const FILTER_CASES = (count: number) =>
  i18n.translate('xpack.cases.mergeCases.differences.fillFrom.filter', {
    values: { count },
    defaultMessage: 'Filter {count} cases',
  });
export const NEXT_FIELD = (field: string) =>
  i18n.translate('xpack.cases.mergeCases.differences.nextField', {
    values: { field },
    defaultMessage: 'Next: {field}',
  });
export const SECTION_TEMPLATE = i18n.translate(
  'xpack.cases.mergeCases.differences.section.template',
  {
    defaultMessage: 'Template',
  }
);
export const SECTION_TEMPLATE_HELP = i18n.translate(
  'xpack.cases.mergeCases.differences.section.templateHelp',
  {
    defaultMessage: 'Decides which template fields the case has',
  }
);
export const SECTION_DETAILS = i18n.translate(
  'xpack.cases.mergeCases.differences.section.details',
  {
    defaultMessage: 'Case details',
  }
);
export const SECTION_CUSTOM_FIELDS = i18n.translate(
  'xpack.cases.mergeCases.differences.section.customFields',
  {
    defaultMessage: 'Custom fields',
  }
);
export const SECTION_TEMPLATE_FIELDS = (template: string) =>
  i18n.translate('xpack.cases.mergeCases.differences.section.templateFields', {
    values: { template },
    defaultMessage: '{template} fields',
  });
export const SECTION_TEMPLATE_FIELDS_DEFAULT = i18n.translate(
  'xpack.cases.mergeCases.differences.section.templateFieldsDefault',
  {
    defaultMessage: 'Template fields',
  }
);
export const SECTION_COMBINED = i18n.translate(
  'xpack.cases.mergeCases.differences.section.combined',
  {
    defaultMessage: 'Combined from every case',
  }
);
export const SECTION_COMBINED_HELP = i18n.translate(
  'xpack.cases.mergeCases.differences.section.combinedHelp',
  {
    defaultMessage: "Nothing to choose. Remove any you don't want.",
  }
);
export const SECTION_SAME = i18n.translate('xpack.cases.mergeCases.differences.section.same', {
  defaultMessage: 'Same in every case',
});
export const SECTION_FIELDS = (count: number) =>
  i18n.translate('xpack.cases.mergeCases.differences.section.fields', {
    values: { count },
    defaultMessage: '{count, plural, one {# field} other {# fields}}',
  });
export const SECTION_LEFT = (count: number) =>
  i18n.translate('xpack.cases.mergeCases.differences.section.left', {
    values: { count },
    defaultMessage: '{count} left',
  });
export const SECTION_CHANGED = (count: number) =>
  i18n.translate('xpack.cases.mergeCases.differences.section.changed', {
    values: { count },
    defaultMessage: '{count} changed',
  });

/**
 * A value every case agrees on, which the user can change
 */

export const SAME_SAVE = i18n.translate('xpack.cases.mergeCases.differences.same.save', {
  defaultMessage: 'Save',
});
export const SAME_YOUR_CHANGE = i18n.translate(
  'xpack.cases.mergeCases.differences.same.yourChange',
  {
    defaultMessage: 'Your change',
  }
);
export const SAME_UNDO = i18n.translate('xpack.cases.mergeCases.differences.same.undo', {
  defaultMessage: 'Undo',
});
export const SAME_UNDO_ARIA = (field: string) =>
  i18n.translate('xpack.cases.mergeCases.differences.same.undoAria', {
    values: { field },
    defaultMessage: 'Undo your change to {field}',
  });
export const SAME_IN_ALL_CASES = (value: string, count: number) =>
  i18n.translate('xpack.cases.mergeCases.differences.same.inAllCases', {
    values: { value, count },
    defaultMessage: '{value} {count, plural, =2 {in both cases} other {in all # cases}}',
  });
export const SAME_IN_SOME_CASES = (value: string, count: number, total: number) =>
  i18n.translate('xpack.cases.mergeCases.differences.same.inSomeCases', {
    values: { value, count, total },
    defaultMessage: '{value} in {count} of {total} cases',
  });
export const SAME_TEMPLATE_DEFAULT = (value: string) =>
  i18n.translate('xpack.cases.mergeCases.differences.same.templateDefault', {
    values: { value },
    defaultMessage: "{value}, the template's default",
  });
export const NOT_SET = i18n.translate('xpack.cases.mergeCases.differences.notSet', {
  defaultMessage: 'Not set',
});
export const NOT_SET_ON = (cases: string) =>
  i18n.translate('xpack.cases.mergeCases.differences.notSetOn', {
    values: { cases },
    defaultMessage: 'Not set on {cases}',
  });
export const TEMPLATE_FIELDS_HIDDEN = i18n.translate(
  'xpack.cases.mergeCases.differences.templateFieldsHidden',
  {
    defaultMessage: "Choose a template to see the template's fields.",
  }
);

/**
 * Value cards
 */

export const SHOW_MORE_VALUES = (count: number) =>
  i18n.translate('xpack.cases.mergeCases.differences.showMoreValues', {
    values: { count },
    defaultMessage: 'Show {count} more values',
  });
export const SHOW_MORE_TITLES = (count: number) =>
  i18n.translate('xpack.cases.mergeCases.differences.showMoreTitles', {
    values: { count },
    defaultMessage: 'Show {count} more titles',
  });
export const SHOW_MORE_DESCRIPTIONS = (count: number) =>
  i18n.translate('xpack.cases.mergeCases.differences.showMoreDescriptions', {
    values: { count },
    defaultMessage: 'Show {count} more descriptions',
  });
export const SHOW_FEWER = i18n.translate('xpack.cases.mergeCases.differences.showFewer', {
  defaultMessage: 'Show fewer',
});
export const OTHER_TITLE = i18n.translate('xpack.cases.mergeCases.differences.other.title', {
  defaultMessage: 'Other title',
});
export const OTHER_DESCRIPTION = i18n.translate(
  'xpack.cases.mergeCases.differences.other.description',
  {
    defaultMessage: 'Other description',
  }
);
export const OTHER_CATEGORY = i18n.translate('xpack.cases.mergeCases.differences.other.category', {
  defaultMessage: 'Other category',
});
export const OTHER_VALUE = i18n.translate('xpack.cases.mergeCases.differences.other.value', {
  defaultMessage: 'Other value',
});
export const OTHER_NUMBER = i18n.translate('xpack.cases.mergeCases.differences.other.number', {
  defaultMessage: 'Other number',
});
export const OTHER_DATE = i18n.translate('xpack.cases.mergeCases.differences.other.date', {
  defaultMessage: 'Other date',
});
export const OTHER_OPTION = i18n.translate('xpack.cases.mergeCases.differences.other.option', {
  defaultMessage: 'Other option',
});
export const SOMEONE_ELSE = i18n.translate('xpack.cases.mergeCases.differences.other.someoneElse', {
  defaultMessage: 'Someone else',
});
export const OTHER_INPUT_ARIA = (field: string) =>
  i18n.translate('xpack.cases.mergeCases.differences.other.inputAria', {
    values: { field },
    defaultMessage: 'Your value for {field}',
  });
export const CHARACTERS_COUNT = (count: number, max: number) =>
  i18n.translate('xpack.cases.mergeCases.differences.charactersCount', {
    values: { count, max },
    defaultMessage: '{count, number} of {max, number} characters',
  });
export const NUMBER_RANGE = (min?: number, max?: number) => {
  if (min != null && max != null) {
    return i18n.translate('xpack.cases.mergeCases.differences.numberRange.between', {
      values: { min, max },
      defaultMessage: 'From {min} to {max}',
    });
  }
  if (min != null) {
    return i18n.translate('xpack.cases.mergeCases.differences.numberRange.min', {
      values: { min },
      defaultMessage: 'At least {min}',
    });
  }
  if (max != null) {
    return i18n.translate('xpack.cases.mergeCases.differences.numberRange.max', {
      values: { max },
      defaultMessage: 'At most {max}',
    });
  }
  return undefined;
};
export const NO_OTHER_OPTIONS = i18n.translate(
  'xpack.cases.mergeCases.differences.noOtherOptions',
  {
    defaultMessage: 'Every option the template offers is already held by a case.',
  }
);
export const CHOOSE_AN_OPTION = i18n.translate(
  'xpack.cases.mergeCases.differences.chooseAnOption',
  {
    defaultMessage: 'Choose an option',
  }
);
export const SEARCH_USERS = i18n.translate('xpack.cases.mergeCases.differences.searchUsers', {
  defaultMessage: 'Search users',
});
export const TOGGLE_ON = i18n.translate('xpack.cases.mergeCases.differences.toggleOn', {
  defaultMessage: 'On',
});
export const TOGGLE_OFF = i18n.translate('xpack.cases.mergeCases.differences.toggleOff', {
  defaultMessage: 'Off',
});

/**
 * Template and connector
 */

export const NO_TEMPLATE = i18n.translate('xpack.cases.mergeCases.differences.template.none', {
  defaultMessage: 'No template',
});
export const NO_TEMPLATE_HELP = i18n.translate(
  'xpack.cases.mergeCases.differences.template.noneHelp',
  {
    defaultMessage: 'Template fields stay on the cases',
  }
);
export const TEMPLATE_TURNED_OFF = i18n.translate(
  'xpack.cases.mergeCases.differences.template.turnedOff',
  {
    defaultMessage: 'Turned off by an admin',
  }
);
export const TEMPLATE_REQUIRED_FIELDS = (count: number, fields: string) =>
  i18n.translate('xpack.cases.mergeCases.differences.template.requiredFields', {
    values: { count, fields },
    defaultMessage:
      '{count, plural, one {# required field needs} other {# required fields need}} a value: {fields}.',
  });
export const TEMPLATE_NOT_COPIED = (count: number, fields: string) =>
  i18n.translate('xpack.cases.mergeCases.differences.template.notCopied', {
    values: { count, fields },
    defaultMessage:
      "{count, plural, one {# field} other {# fields}} the template doesn't have {count, plural, one {stays} other {stay}} on {count, plural, one {its case} other {their cases}}: {fields}.",
  });
export const NO_CONNECTOR = i18n.translate('xpack.cases.mergeCases.differences.connector.none', {
  defaultMessage: 'No connector',
});
export const CONNECTOR_PUSH_NOTE = i18n.translate(
  'xpack.cases.mergeCases.differences.connector.pushNote',
  {
    defaultMessage:
      'Existing tickets stay linked to their source cases; push the merged case to open its own.',
  }
);

/**
 * Combined fields
 */

export const ADD_TAGS = i18n.translate('xpack.cases.mergeCases.differences.tags.add', {
  defaultMessage: 'Add tags',
});
export const TAGS_OVER_LIMIT = (total: number, max: number, over: number) =>
  i18n.translate('xpack.cases.mergeCases.differences.tags.overLimit', {
    values: { total, max, over },
    defaultMessage: '{total} tags; a case holds {max}. Remove {over} to continue.',
  });
export const REMOVE_SINGLE_CASE_TAGS = (count: number) =>
  i18n.translate('xpack.cases.mergeCases.differences.tags.removeSingleCase', {
    values: { count },
    defaultMessage: 'Remove the {count, plural, one {# tag} other {# tags}} only one case used',
  });
export const TAG_EMPTY = i18n.translate('xpack.cases.mergeCases.differences.tags.empty', {
  defaultMessage: 'A tag must contain at least one character',
});
export const TAG_TOO_LONG = (max: number) =>
  i18n.translate('xpack.cases.mergeCases.differences.tags.tooLong', {
    values: { max },
    defaultMessage: 'A tag can have at most {max} characters',
  });
export const ADD_ASSIGNEES = i18n.translate('xpack.cases.mergeCases.differences.assignees.add', {
  defaultMessage: 'Add assignees',
});
export const ADD_PEOPLE = i18n.translate('xpack.cases.mergeCases.differences.people.add', {
  defaultMessage: 'Add people',
});
export const ASSIGNEES_OVER_LIMIT = (total: number, max: number, over: number) =>
  i18n.translate('xpack.cases.mergeCases.differences.assignees.overLimit', {
    values: { total, max, over },
    defaultMessage: '{total} assignees; a case holds {max}. Remove {over} to continue.',
  });
export const ASSIGNEES_LOCKED_NEW_CASE = i18n.translate(
  'xpack.cases.mergeCases.differences.assignees.lockedNewCase',
  {
    defaultMessage: 'The new case gets no assignees.',
  }
);
export const ASSIGNEES_LOCKED_EXISTING = (caseRef: string) =>
  i18n.translate('xpack.cases.mergeCases.differences.assignees.lockedExisting', {
    values: { caseRef },
    defaultMessage: '{caseRef} keeps its own assignees.',
  });
export const ASSIGNEES_LOCKED_PRIVILEGE = i18n.translate(
  'xpack.cases.mergeCases.differences.assignees.lockedPrivilege',
  {
    defaultMessage: 'Assigning users needs the Assign privilege for Cases.',
  }
);
export const ASSIGNEES_LOCKED_LICENSE = i18n.translate(
  'xpack.cases.mergeCases.differences.assignees.lockedLicense',
  {
    defaultMessage: 'Changing assignees needs a Platinum license.',
  }
);
export const NOT_COPIED_VALUES = (values: string, template: string) =>
  i18n.translate('xpack.cases.mergeCases.differences.multi.notCopied', {
    values: { values, template },
    defaultMessage: "{values} isn't an option in {template} and isn't copied.",
  });
export const UNKNOWN_USER = i18n.translate('xpack.cases.mergeCases.differences.unknownUser', {
  defaultMessage: 'Unknown user',
});

/**
 * Case references
 */

export const SHOW_CASE_DETAILS = (caseRef: string) =>
  i18n.translate('xpack.cases.mergeCases.differences.refs.showDetails', {
    values: { caseRef },
    defaultMessage: 'Show details of case {caseRef}',
  });
export const MORE_CASES = (count: number) =>
  i18n.translate('xpack.cases.mergeCases.differences.refs.more', {
    values: { count },
    defaultMessage: '+{count}',
  });
export const MORE_CASES_ARIA = (count: number) =>
  i18n.translate('xpack.cases.mergeCases.differences.refs.moreAria', {
    values: { count },
    defaultMessage: 'Show {count} more cases',
  });
export const MORE_CASES_TITLE = (count: number) =>
  i18n.translate('xpack.cases.mergeCases.differences.refs.moreTitle', {
    values: { count },
    defaultMessage: '{count} more {count, plural, one {case} other {cases}}',
  });
export const HOVER_TEMPLATE = i18n.translate('xpack.cases.mergeCases.differences.hover.template', {
  defaultMessage: 'Template',
});
export const HOVER_TAGS = i18n.translate('xpack.cases.mergeCases.differences.hover.tags', {
  defaultMessage: 'Tags',
});
export const CASE_CARD_ARIA = (caseRef: string) =>
  i18n.translate('xpack.cases.mergeCases.differences.hover.cardAria', {
    values: { caseRef },
    defaultMessage: 'Details of case {caseRef}',
  });
export const HOVER_MORE_TAGS = (count: number) =>
  i18n.translate('xpack.cases.mergeCases.differences.hover.moreTags', {
    values: { count },
    defaultMessage: '+{count}',
  });
export const RESOLVE_WITH_AI = i18n.translate('xpack.cases.mergeCases.differences.ai.resolve', {
  defaultMessage: 'Resolve with AI',
});
export const RESOLVING_WITH_AI = i18n.translate('xpack.cases.mergeCases.differences.ai.resolving', {
  defaultMessage: 'Resolving…',
});
export const RESOLVE_WITH_AI_HELP = i18n.translate(
  'xpack.cases.mergeCases.differences.ai.resolveHelp',
  {
    defaultMessage:
      'AI chooses a value for every field that differs, replacing what is set. Check each value before you go on.',
  }
);
export const AI_SUGGESTED = i18n.translate('xpack.cases.mergeCases.differences.ai.suggested', {
  defaultMessage: 'Suggested by AI',
});
export const AI_SUGGESTED_WITH_REASON = (reason: string) =>
  i18n.translate('xpack.cases.mergeCases.differences.ai.suggestedWithReason', {
    values: { reason },
    defaultMessage: 'Suggested by AI: {reason}',
  });
