/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import { indexPatterns } from '@kbn/data-plugin/public';
export function validateIndexPattern(indexPattern, rollupIndex) {
  if (!indexPattern || !indexPattern.trim()) {
    return [
      <FormattedMessage
        id="xpack.rollupJobs.create.errors.indexPatternMissing"
        defaultMessage="Index pattern is required."
      />,
    ];
  }

  if (indexPattern === rollupIndex) {
    return [
      <FormattedMessage
        id="xpack.rollupJobs.create.errors.indexPatternSameAsRollupIndex"
        defaultMessage="Index pattern cannot have the same as the rollup index."
      />,
    ];
  }

  const illegalCharacters = indexPatterns.ILLEGAL_CHARACTERS_VISIBLE.reduce((chars, char) => {
    if (indexPattern.includes(char)) {
      chars.push(char);
    }

    return chars;
  }, []);

  if (illegalCharacters.length) {
    return [
      <FormattedMessage
        id="xpack.rollupJobs.create.errors.indexPatternIllegalCharacters"
        defaultMessage="Remove the characters {characterList} from your index pattern."
        values={{ characterList: <strong>{illegalCharacters.join(' ')}</strong> }}
      />,
    ];
  }

  if (indexPattern.includes(' ')) {
    return [
      <FormattedMessage
        id="xpack.rollupJobs.create.errors.indexPatternSpaces"
        defaultMessage="Remove the spaces from your index pattern."
      />,
    ];
  }

  return undefined;
}
