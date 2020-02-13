/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const defaultLabel = i18n.translate('xpack.painlessLab.contextDefaultLabel', {
  defaultMessage: 'Basic',
});

const filterLabel = i18n.translate('xpack.painlessLab.contextFilterLabel', {
  defaultMessage: 'Filter',
});

const scoreLabel = i18n.translate('xpack.painlessLab.contextScoreLabel', {
  defaultMessage: 'Score',
});

export const painlessContextOptions = [
  {
    value: 'painless_test',
    inputDisplay: defaultLabel,
    dropdownDisplay: (
      <>
        <strong>{defaultLabel}</strong>
        <EuiText size="s" color="subdued">
          <p className="euiTextColor--subdued">The script result will be converted to a string</p>
        </EuiText>
      </>
    ),
  },
  {
    value: 'filter',
    inputDisplay: filterLabel,
    dropdownDisplay: (
      <>
        <strong>{filterLabel}</strong>
        <EuiText size="s" color="subdued">
          <p className="euiTextColor--subdued">Use the context of a filter&rsquo;s script query</p>
        </EuiText>
      </>
    ),
  },
  {
    value: 'score',
    inputDisplay: scoreLabel,
    dropdownDisplay: (
      <>
        <strong>{scoreLabel}</strong>
        <EuiText size="s" color="subdued">
          <p className="euiTextColor--subdued">
            Use the context of a cript_score function in function_score query
          </p>
        </EuiText>
      </>
    ),
  },
];
