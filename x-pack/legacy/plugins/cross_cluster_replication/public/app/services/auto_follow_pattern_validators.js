/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  indexNameBeginsWithPeriod,
  findIllegalCharactersInIndexName,
  indexNameContainsSpaces,
} from 'ui/indices';

import { indexPatterns } from '../../../../../../../src/plugins/data/public';

export const validateName = (name = '') => {
  let errorMsg = null;

  if (!name || !name.trim()) {
    errorMsg = i18n.translate(
      'xpack.crossClusterReplication.autoFollowPattern.nameValidation.errorEmptyName',
      { defaultMessage: 'Name is required.' }
    );
  } else {
    if (name.includes(' ')) {
      errorMsg = i18n.translate(
        'xpack.crossClusterReplication.autoFollowPattern.nameValidation.errorSpace',
        {
          defaultMessage: 'Spaces are not allowed in the name.',
        }
      );
    }

    if (name[0] === '_') {
      errorMsg = i18n.translate(
        'xpack.crossClusterReplication.autoFollowPattern.nameValidation.errorUnderscore',
        { defaultMessage: `Name can't begin with an underscore.` }
      );
    }

    if (name.includes(',')) {
      errorMsg = i18n.translate(
        'xpack.crossClusterReplication.autoFollowPattern.nameValidation.errorComma',
        { defaultMessage: 'Commas are not allowed in the name.' }
      );
    }
  }
  return errorMsg;
};

export const validateLeaderIndexPattern = indexPattern => {
  if (indexPattern) {
    const errors = indexPatterns.validate(indexPattern);

    if (errors[indexPatterns.ILLEGAL_CHARACTERS]) {
      return {
        message: (
          <FormattedMessage
            id="xpack.crossClusterReplication.autoFollowPattern.leaderIndexPatternValidation.illegalCharacters"
            defaultMessage="Remove the {characterListLength, plural, one {character} other {characters}}
          {characterList} from the index pattern."
            values={{
              characterList: <strong>{errors[indexPatterns.ILLEGAL_CHARACTERS].join(' ')}</strong>,
              characterListLength: errors[indexPatterns.ILLEGAL_CHARACTERS].length,
            }}
          />
        ),
      };
    }

    if (errors[indexPatterns.CONTAINS_SPACES_KEY]) {
      return {
        message: (
          <FormattedMessage
            id="xpack.crossClusterReplication.autoFollowPattern.leaderIndexPatternValidation.noEmptySpace"
            defaultMessage="Spaces are not allowed in the index pattern."
          />
        ),
      };
    }
  }

  if (!indexPattern || !indexPattern.trim()) {
    return {
      message: i18n.translate(
        'xpack.crossClusterReplication.autoFollowPattern.leaderIndexPatternValidation.isEmpty',
        {
          defaultMessage: 'At least one leader index pattern is required.',
        }
      ),
    };
  }

  return null;
};

export const validateLeaderIndexPatterns = indexPatterns => {
  // We only need to check if a value has been provided, because validation for this field
  // has already been executed as the user has entered input into it.
  if (!indexPatterns.length) {
    return {
      message: i18n.translate(
        'xpack.crossClusterReplication.autoFollowPattern.leaderIndexPatternValidation.isEmpty',
        {
          defaultMessage: 'At least one leader index pattern is required.',
        }
      ),
    };
  }

  return null;
};

export const validatePrefix = prefix => {
  // If it's empty, it is valid
  if (!prefix || !prefix.trim()) {
    return null;
  }

  // Prefix can't begin with a period, because that's reserved for system indices.
  if (indexNameBeginsWithPeriod(prefix)) {
    return (
      <FormattedMessage
        id="xpack.crossClusterReplication.autoFollowPattern.prefixValidation.beginsWithPeriod"
        defaultMessage="The prefix can't begin with a period."
      />
    );
  }

  const illegalCharacters = findIllegalCharactersInIndexName(prefix);

  if (illegalCharacters.length) {
    return (
      <FormattedMessage
        id="xpack.crossClusterReplication.autoFollowPattern.prefixValidation.illegalCharacters"
        defaultMessage="Remove the {characterListLength, plural, one {character} other {characters}}
          {characterList} from the prefix."
        values={{
          characterList: <strong>{illegalCharacters.join(' ')}</strong>,
          characterListLength: illegalCharacters.length,
        }}
      />
    );
  }

  if (indexNameContainsSpaces(prefix)) {
    return (
      <FormattedMessage
        id="xpack.crossClusterReplication.autoFollowPattern.prefixValidation.noEmptySpace"
        defaultMessage="Spaces are not allowed in the prefix."
      />
    );
  }

  return null;
};

export const validateSuffix = suffix => {
  // If it's empty, it is valid
  if (!suffix || !suffix.trim()) {
    return null;
  }

  const illegalCharacters = findIllegalCharactersInIndexName(suffix);

  if (illegalCharacters.length) {
    return (
      <FormattedMessage
        id="xpack.crossClusterReplication.autoFollowPattern.suffixValidation.illegalCharacters"
        defaultMessage="Remove the {characterListLength, plural, one {character} other {characters}}
          {characterList} from the suffix."
        values={{
          characterList: <strong>{illegalCharacters.join(' ')}</strong>,
          characterListLength: illegalCharacters.length,
        }}
      />
    );
  }

  if (indexNameContainsSpaces(suffix)) {
    return (
      <FormattedMessage
        id="xpack.crossClusterReplication.autoFollowPattern.suffixValidation.noEmptySpace"
        defaultMessage="Spaces are not allowed in the suffix."
      />
    );
  }

  return null;
};

export const validateAutoFollowPattern = (autoFollowPattern = {}) => {
  const errors = {};
  let error = null;
  let fieldValue;

  Object.keys(autoFollowPattern).forEach(fieldName => {
    fieldValue = autoFollowPattern[fieldName];
    error = null;

    switch (fieldName) {
      case 'name':
        error = validateName(fieldValue);
        break;

      case 'leaderIndexPatterns':
        error = validateLeaderIndexPatterns(fieldValue);
        break;

      case 'followIndexPatternPrefix':
        error = validatePrefix(fieldValue);
        break;

      case 'followIndexPatternSuffix':
        error = validateSuffix(fieldValue);
        break;
    }

    errors[fieldName] = error;
  });

  return errors;
};
