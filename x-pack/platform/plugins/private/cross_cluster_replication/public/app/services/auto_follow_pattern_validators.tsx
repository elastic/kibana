/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactElement, ReactNode } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  ILLEGAL_CHARACTERS_KEY,
  CONTAINS_SPACES_KEY,
  validateDataView,
} from '@kbn/data-views-plugin/public';
import { indices } from '../../shared_imports';

const { indexNameBeginsWithPeriod, findIllegalCharactersInIndexName, indexNameContainsSpaces } =
  indices;

export const validateName = (name = ''): string | null => {
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

export const validateLeaderIndexPattern = (
  indexPattern: string | undefined
): { message: ReactNode } | null => {
  if (indexPattern) {
    const errors = validateDataView(indexPattern);

    if (errors[ILLEGAL_CHARACTERS_KEY]) {
      return {
        message: (
          <FormattedMessage
            id="xpack.crossClusterReplication.autoFollowPattern.leaderIndexPatternValidation.illegalCharacters"
            defaultMessage="Remove the {characterListLength, plural, one {character} other {characters}}
          {characterList} from the index pattern."
            values={{
              characterList: <strong>{errors[ILLEGAL_CHARACTERS_KEY].join(' ')}</strong>,
              characterListLength: errors[ILLEGAL_CHARACTERS_KEY].length,
            }}
          />
        ),
      };
    }

    if (errors[CONTAINS_SPACES_KEY]) {
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

export const validateLeaderIndexPatterns = (
  indexPatterns: string[]
): { message: ReactNode } | null => {
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

export const validatePrefix = (prefix: string): ReactElement | null => {
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

export const validateSuffix = (suffix: string): ReactElement | null => {
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

export interface AutoFollowPatternValidationFields {
  name?: string;
  leaderIndexPatterns?: string[];
  followIndexPatternPrefix?: string;
  followIndexPatternSuffix?: string;
  remoteCluster?: string;
}

export interface MessageError {
  message: ReactNode;
  alwaysVisible?: boolean;
}

export interface AutoFollowPatternValidationErrors {
  name?: string | null;
  leaderIndexPatterns?: MessageError | null;
  followIndexPatternPrefix?: ReactElement | null;
  followIndexPatternSuffix?: ReactElement | null;
  remoteCluster?: MessageError | null;
}

export const validateAutoFollowPattern = (
  autoFollowPattern: AutoFollowPatternValidationFields = {}
): AutoFollowPatternValidationErrors => {
  const errors: AutoFollowPatternValidationErrors = {};

  if (autoFollowPattern.name !== undefined) {
    errors.name = validateName(autoFollowPattern.name);
  }

  if (autoFollowPattern.leaderIndexPatterns !== undefined) {
    errors.leaderIndexPatterns = validateLeaderIndexPatterns(autoFollowPattern.leaderIndexPatterns);
  }

  if (autoFollowPattern.followIndexPatternPrefix !== undefined) {
    errors.followIndexPatternPrefix = validatePrefix(autoFollowPattern.followIndexPatternPrefix);
  }

  if (autoFollowPattern.followIndexPatternSuffix !== undefined) {
    errors.followIndexPatternSuffix = validateSuffix(autoFollowPattern.followIndexPatternSuffix);
  }

  return errors;
};
