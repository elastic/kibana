/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { css } from '@emotion/react';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { Query } from '@kbn/es-query';
import type { KqlPluginStart, SuggestionsAbstraction } from '@kbn/kql/public';
import { useService } from '@kbn/core-di-browser';
import { PluginStart } from '@kbn/core-di';
import { MATCHER_CONTEXT_FIELDS } from '@kbn/alerting-v2-schemas';

interface MatcherInputProps {
  value: string;
  onChange: (value: string) => void;
  fullWidth?: boolean;
  placeholder?: string;
  'data-test-subj'?: string;
  dataFieldNames?: string[];
}

const matcherSuggestionsAbstraction: SuggestionsAbstraction = {
  type: 'action_policies',
  fields: {},
};

const autoHeightContainer = css`
  & > div {
    height: auto;
  }
`;

export const MatcherInput = ({
  value,
  onChange,
  fullWidth,
  placeholder,
  'data-test-subj': dataTestSubj,
  dataFieldNames,
}: MatcherInputProps) => {
  const { QueryStringInput } = useService(PluginStart('kql')) as KqlPluginStart;

  const syntheticDataView = useMemo(() => {
    const baseFields = MATCHER_CONTEXT_FIELDS.map((f) => ({
      name: f.path,
      type: f.type === 'boolean' ? 'boolean' : 'string',
      esTypes: [f.type === 'boolean' ? 'boolean' : 'keyword'],
      searchable: true,
      aggregatable: true,
    }));

    const dataFields = (dataFieldNames ?? []).map((name) => ({
      name,
      type: 'string',
      esTypes: ['keyword'],
      searchable: true,
      aggregatable: true,
    }));

    return [
      {
        title: '',
        fieldFormatMap: {},
        fields: [...baseFields, ...dataFields],
      },
    ] as unknown as DataView[];
  }, [dataFieldNames]);

  const query: Query = useMemo(() => ({ query: value, language: 'kuery' }), [value]);

  const handleChange = useCallback(
    (q: Query) => onChange(typeof q.query === 'string' ? q.query : ''),
    [onChange]
  );

  return (
    <div css={autoHeightContainer}>
      <QueryStringInput
        appName="alertingV2"
        indexPatterns={syntheticDataView}
        query={query}
        onChange={handleChange}
        disableAutoFocus
        disableLanguageSwitcher={true}
        bubbleSubmitEvent={false}
        isClearable
        placeholder={placeholder}
        dataTestSubj={dataTestSubj}
        size="s"
        className={fullWidth ? 'euiFieldText--fullWidth' : undefined}
        suggestionsAbstraction={matcherSuggestionsAbstraction}
        suggestionsDebounceMs={300}
      />
    </div>
  );
};
