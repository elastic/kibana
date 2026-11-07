/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { BoostProfileType } from '../../../common/types';
import type { IndexPatternError, ProfileNameError } from '../../../common/validation';
import { INDEX_PATTERN_MAX_LENGTH, PROFILE_NAME_MAX_LENGTH } from '../../../common/validation';

export const RULE_NAME_ERROR_MESSAGES: Readonly<Record<ProfileNameError, string>> = {
  required: i18n.translate('xpack.boost.ruleForm.nameRequired', {
    defaultMessage: 'Enter a name.',
  }),
  too_long: i18n.translate('xpack.boost.ruleForm.nameTooLong', {
    defaultMessage: 'Use {max} characters or fewer.',
    values: { max: PROFILE_NAME_MAX_LENGTH },
  }),
  invalid_characters: i18n.translate('xpack.boost.ruleForm.nameInvalid', {
    defaultMessage:
      'Use lowercase letters, numbers, hyphens, and underscores, starting with a letter or number.',
  }),
  already_exists: i18n.translate('xpack.boost.ruleForm.nameTaken', {
    defaultMessage: 'A boost rule with this name already exists.',
  }),
};

export const PROFILE_REQUIRED_MESSAGE = i18n.translate('xpack.boost.ruleForm.profileRequired', {
  defaultMessage: 'Select a boost profile.',
});

export const INDEX_PATTERN_ERROR_MESSAGES: Readonly<Record<IndexPatternError, string>> = {
  required: i18n.translate('xpack.boost.ruleForm.patternRequired', {
    defaultMessage: 'Enter a pattern or name.',
  }),
  too_long: i18n.translate('xpack.boost.ruleForm.patternTooLong', {
    defaultMessage: 'Use {max} characters or fewer.',
    values: { max: INDEX_PATTERN_MAX_LENGTH },
  }),
  invalid_characters: i18n.translate('xpack.boost.ruleForm.patternInvalid', {
    defaultMessage: 'Enter one pattern or name, without commas or spaces.',
  }),
};

/** A tie with another rule, which Elasticsearch rejects since neither rule would apply. */
export const getPriorityConflictMessage = (type: BoostProfileType, ruleName: string): string =>
  type === 'indices'
    ? i18n.translate('xpack.boost.ruleForm.priorityConflict.indices', {
        defaultMessage: 'Ties with rule "{ruleName}" on the same indices. Choose another priority.',
        values: { ruleName },
      })
    : i18n.translate('xpack.boost.ruleForm.priorityConflict.dataStreams', {
        defaultMessage:
          'Ties with rule "{ruleName}" on the same data streams. Choose another priority.',
        values: { ruleName },
      });
