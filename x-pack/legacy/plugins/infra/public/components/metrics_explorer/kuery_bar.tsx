/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fromKueryExpression } from '@kbn/es-query';
import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import React, { useEffect, useState } from 'react';
import { StaticIndexPattern } from 'ui/index_patterns';
import { WithKueryAutocompletion } from '../../containers/with_kuery_autocompletion';
import { AutocompleteField } from '../autocomplete_field';

interface Props {
  intl: InjectedIntl;
  derivedIndexPattern: StaticIndexPattern;
  onSubmit: (query: string) => void;
  value?: string | null;
}

function validateQuery(query: string) {
  try {
    fromKueryExpression(query);
  } catch (err) {
    return false;
  }
  return true;
}

export const MetricsExplorerKueryBar = injectI18n(
  ({ intl, derivedIndexPattern, onSubmit, value }: Props) => {
    const [draftQuery, setDraftQuery] = useState<string>(value || '');
    const [isValid, setValidation] = useState<boolean>(true);

    // This ensures that if value changes out side this component it will update.
    useEffect(
      () => {
        if (value) {
          setDraftQuery(value);
        }
      },
      [value]
    );

    const handleChange = (query: string) => {
      setValidation(validateQuery(query));
      setDraftQuery(query);
    };

    return (
      <WithKueryAutocompletion indexPattern={derivedIndexPattern}>
        {({ isLoadingSuggestions, loadSuggestions, suggestions }) => (
          <AutocompleteField
            isLoadingSuggestions={isLoadingSuggestions}
            isValid={isValid}
            loadSuggestions={loadSuggestions}
            onChange={handleChange}
            onSubmit={onSubmit}
            placeholder={intl.formatMessage({
              id: 'xpack.infra.homePage.toolbar.kqlSearchFieldPlaceholder',
              defaultMessage: 'Search for infrastructure data… (e.g. host.name:host-1)',
            })}
            suggestions={suggestions}
            value={draftQuery}
          />
        )}
      </WithKueryAutocompletion>
    );
  }
);
