/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import { fromKueryExpression, type Query } from '@kbn/es-query';
import type { KqlPluginStart, SuggestionsAbstraction } from '@kbn/kql/public';
import { useService } from '@kbn/core-di-browser';
import { PluginStart } from '@kbn/core-di';
import type { HttpStart } from '@kbn/core-http-browser';
import { ALERTING_V2_INTERNAL_SUGGESTIONS_RULE_EVENT_FIELDS_API_PATH } from '@kbn/alerting-v2-constants';
import { useAdditionalEpisodesDataSource } from '@kbn/alerting-v2-episodes-ui/context/episode_data_source_context';
import type { EpisodeSearchField } from '@kbn/alerting-v2-episodes-ui/types/episode_data_source';

interface EpisodesKqlInputProps {
  value: string;
  onChange: (value: string, isValid: boolean) => void;
  placeholder?: string;
  'data-test-subj'?: string;
  http: HttpStart;
}

const EPISODE_BASE_FIELDS: EpisodeSearchField[] = [
  'episode.status',
  'episode.id',
  'severity',
  'rule.id',
  'group_hash',
  'source',
].map((name) => ({
  name,
  type: 'string',
  esTypes: ['keyword'],
  searchable: true,
  aggregatable: true,
}));

const episodesSearchSuggestionsAbstraction: SuggestionsAbstraction = {
  type: 'alerting/v2',
  fields: {},
};

const isValidKql = (value: string): boolean => {
  try {
    fromKueryExpression(value);
    return true;
  } catch {
    return false;
  }
};

export const EpisodesKqlInput = ({
  value,
  onChange,
  placeholder,
  'data-test-subj': dataTestSubj,
  http,
}: EpisodesKqlInputProps) => {
  const { QueryStringInput } = useService(PluginStart('kql')) as KqlPluginStart;
  const additionalDataSource = useAdditionalEpisodesDataSource();
  const [dataFieldNames, setDataFieldNames] = useState<string[]>([]);
  const [additionalSourceFields, setAdditionalSourceFields] = useState<EpisodeSearchField[]>([]);

  useEffect(() => {
    const abortController = new AbortController();
    http
      .get<string[]>(ALERTING_V2_INTERNAL_SUGGESTIONS_RULE_EVENT_FIELDS_API_PATH, {
        signal: abortController.signal,
      })
      .then(setDataFieldNames)
      .catch(() => undefined);

    return () => abortController.abort();
  }, [http]);

  useEffect(() => {
    const abortController = new AbortController();
    if (additionalDataSource?.fetchSearchFields) {
      additionalDataSource
        .fetchSearchFields({ services: { http }, abortSignal: abortController.signal })
        .then(setAdditionalSourceFields)
        .catch(() => undefined);
    }

    return () => abortController.abort();
  }, [additionalDataSource, http]);

  const syntheticDataView = useMemo(() => {
    const dataFields: EpisodeSearchField[] = dataFieldNames.map((name) => ({
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
        fields: [...EPISODE_BASE_FIELDS, ...dataFields, ...additionalSourceFields],
      },
    ] as unknown as DataView[];
  }, [additionalSourceFields, dataFieldNames]);

  const query: Query = useMemo(() => ({ query: value, language: 'kuery' }), [value]);
  const isInvalid = !isValidKql(value);
  const handleChange = useCallback(
    (nextQuery: Query) => {
      const nextValue = typeof nextQuery.query === 'string' ? nextQuery.query : '';
      onChange(nextValue, isValidKql(nextValue));
    },
    [onChange]
  );

  return (
    <QueryStringInput
      appName="alertingV2"
      indexPatterns={syntheticDataView}
      query={query}
      onChange={handleChange}
      isInvalid={isInvalid}
      disableAutoFocus
      disableLanguageSwitcher
      bubbleSubmitEvent={false}
      isClearable={!isInvalid}
      placeholder={placeholder}
      dataTestSubj={dataTestSubj}
      size="s"
      className="euiFieldText--fullWidth"
      suggestionsAbstraction={episodesSearchSuggestionsAbstraction}
      suggestionsDebounceMs={300}
    />
  );
};
