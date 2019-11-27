/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

import React, { useEffect, useState } from 'react';
import { StaticIndexPattern } from 'ui/index_patterns';
import { WithKueryAutocompletion } from '../../containers/with_kuery_autocompletion';
import { AutocompleteField } from '../autocomplete_field';
import { isDisplayable } from '../../utils/is_displayable';
import { esKuery } from '../../../../../../../src/plugins/data/public';

interface Props {
  derivedIndexPattern: StaticIndexPattern;
  onSubmit: (query: string) => void;
  value?: string | null;
}

function validateQuery(query: string) {
  try {
    esKuery.fromKueryExpression(query);
  } catch (err) {
    return false;
  }
  return true;
}

export const MetricsExplorerKueryBar = ({ derivedIndexPattern, onSubmit, value }: Props) => {
  const [draftQuery, setDraftQuery] = useState<string>(value || '');
  const [isValid, setValidation] = useState<boolean>(true);

  // This ensures that if value changes out side this component it will update.
  useEffect(() => {
    if (value) {
      setDraftQuery(value);
    }
  }, [value]);

  const handleChange = (query: string) => {
    setValidation(validateQuery(query));
    setDraftQuery(query);
  };

  const filteredDerivedIndexPattern = {
    ...derivedIndexPattern,
    fields: derivedIndexPattern.fields.filter(field => isDisplayable(field)),
  };

  return (
    <WithKueryAutocompletion indexPattern={filteredDerivedIndexPattern}>
      {({ isLoadingSuggestions, loadSuggestions, suggestions }) => (
        <AutocompleteField
          isLoadingSuggestions={isLoadingSuggestions}
          isValid={isValid}
          loadSuggestions={loadSuggestions}
          onChange={handleChange}
          onSubmit={onSubmit}
          placeholder={i18n.translate('xpack.infra.homePage.toolbar.kqlSearchFieldPlaceholder', {
            defaultMessage: 'Search for infrastructure data… (e.g. host.name:host-1)',
          })}
          suggestions={suggestions}
          value={draftQuery}
        />
      )}
    </WithKueryAutocompletion>
  );
};
