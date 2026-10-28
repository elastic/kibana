/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { Query } from '@kbn/es-query';
import type { KqlPluginStart, SuggestionsAbstraction } from '@kbn/kql/public';
import { useService } from '@kbn/core-di-browser';
import { PluginStart } from '@kbn/core-di';
import type { HttpStart, IHttpFetchError } from '@kbn/core-http-browser';
import { ALERTING_V2_INTERNAL_SUGGESTIONS_RULE_EVENT_FIELDS_API_PATH } from '@kbn/alerting-v2-constants';
import { EPISODE_KQL_FIELDS } from '@kbn/alerting-v2-common-queries';
import { useAdditionalEpisodesDataSource } from '@kbn/alerting-v2-episodes-ui/context/episode_data_source_context';
import type { EpisodeSearchField } from '@kbn/alerting-v2-episodes-ui/types/episode_data_source';
import useAsync from 'react-use/lib/useAsync';
import { validateEpisodeKql } from '../utils/episodes_query_filter';

interface EpisodesKqlInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  'data-test-subj'?: string;
  http: HttpStart;
}

const keywordField = (name: string): EpisodeSearchField => ({
  name,
  type: 'string',
  esTypes: ['keyword'],
  searchable: true,
  aggregatable: true,
});

const EPISODE_BASE_FIELDS: EpisodeSearchField[] = EPISODE_KQL_FIELDS.map(({ name, type }) => ({
  name,
  type: type === 'keyword' ? 'string' : type,
  esTypes: [type === 'keyword' ? 'keyword' : type === 'number' ? 'long' : 'date'],
  searchable: true,
  aggregatable: true,
}));

const reportUnexpectedFieldLoadError = (message: string, error: unknown) => {
  const status = (error as IHttpFetchError | undefined)?.response?.status;
  if ((error as Error | undefined)?.name === 'AbortError' || status === 403) {
    return;
  }
  window.console.warn(message, error);
};

export const EpisodesKqlInput = ({
  value,
  onChange,
  onSubmit,
  placeholder,
  'data-test-subj': dataTestSubj,
  http,
}: EpisodesKqlInputProps) => {
  const { QueryStringInput } = useService(PluginStart('kql')) as KqlPluginStart;
  const dataViews = useService<DataViewsPublicPluginStart>(PluginStart('dataViews'));
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
      .catch((error) =>
        reportUnexpectedFieldLoadError('Failed to load alert search fields.', error)
      );

    return () => abortController.abort();
  }, [http]);

  useEffect(() => {
    const abortController = new AbortController();
    if (additionalDataSource?.fetchSearchFields) {
      additionalDataSource
        .fetchSearchFields({ services: { http }, abortSignal: abortController.signal })
        .then(setAdditionalSourceFields)
        .catch((error) =>
          reportUnexpectedFieldLoadError('Failed to load additional alert search fields.', error)
        );
    }

    return () => abortController.abort();
  }, [additionalDataSource, http]);

  const syntheticDataViewSpec = useMemo<DataViewSpec>(() => {
    const dataFields = dataFieldNames.map(keywordField);
    const fields = [...EPISODE_BASE_FIELDS, ...dataFields, ...additionalSourceFields];

    return {
      title: '',
      fieldFormatMap: {},
      fields: Object.fromEntries(fields.map((field) => [field.name, field])),
    };
  }, [additionalSourceFields, dataFieldNames]);
  const { value: syntheticDataView } = useAsync(
    () => dataViews.create(syntheticDataViewSpec, true),
    [dataViews, syntheticDataViewSpec]
  );

  const suggestionsAbstraction = useMemo<SuggestionsAbstraction>(
    () => ({
      type: 'alerting/v2',
      fields: {},
      valueSuggestionTypeByField: Object.fromEntries(
        additionalSourceFields.map(({ name }) => [name, 'alerts' as const])
      ),
    }),
    [additionalSourceFields]
  );

  const query: Query = useMemo(() => ({ query: value, language: 'kuery' }), [value]);
  const isInvalid = !validateEpisodeKql(value).isValid;
  const handleChange = useCallback(
    (nextQuery: Query) => {
      const nextValue = typeof nextQuery.query === 'string' ? nextQuery.query : '';
      onChange(nextValue);
    },
    [onChange]
  );

  return (
    <QueryStringInput
      appName="alertingV2"
      indexPatterns={syntheticDataView ? [syntheticDataView] : []}
      query={query}
      onChange={handleChange}
      onSubmit={onSubmit}
      isInvalid={isInvalid}
      disableAutoFocus
      disableLanguageSwitcher
      bubbleSubmitEvent={false}
      isClearable={!isInvalid}
      placeholder={placeholder}
      dataTestSubj={dataTestSubj}
      size="s"
      className="euiFieldText--fullWidth"
      suggestionsAbstraction={suggestionsAbstraction}
      suggestionsDebounceMs={300}
    />
  );
};
