/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { Query } from '@kbn/es-query';
import type { KqlPluginStart, SuggestionsAbstraction } from '@kbn/kql/public';
import { useService } from '@kbn/core-di-browser';
import { PluginStart } from '@kbn/core-di';
import type { HttpStart } from '@kbn/core-http-browser';
import { ALERTING_V2_INTERNAL_SUGGESTIONS_RULE_EVENT_FIELDS_API_PATH } from '@kbn/alerting-v2-constants';
import { useAdditionalEpisodesDataSource } from '@kbn/alerting-v2-episodes-ui/context/episode_data_source_context';
import type { EpisodeSearchField } from '@kbn/alerting-v2-episodes-ui/types/episode_data_source';

interface EpisodesKqlInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  'data-test-subj'?: string;
  http: HttpStart;
}

/** Fixed searchable fields on the raw .rule-events index. */
const EPISODE_BASE_FIELDS = [
  {
    name: 'episode.status',
    type: 'string',
    esTypes: ['keyword'],
    searchable: true,
    aggregatable: true,
  },
  {
    name: 'episode.id',
    type: 'string',
    esTypes: ['keyword'],
    searchable: true,
    aggregatable: true,
  },
  {
    name: 'severity',
    type: 'string',
    esTypes: ['keyword'],
    searchable: true,
    aggregatable: true,
  },
  {
    name: 'rule.id',
    type: 'string',
    esTypes: ['keyword'],
    searchable: true,
    aggregatable: true,
  },
  {
    name: 'group_hash',
    type: 'string',
    esTypes: ['keyword'],
    searchable: true,
    aggregatable: true,
  },
  {
    name: 'source',
    type: 'string',
    esTypes: ['keyword'],
    searchable: true,
    aggregatable: true,
  },
] as const;

const episodesSearchSuggestionsAbstraction: SuggestionsAbstraction = {
  type: 'alerting/v2',
  fields: {},
};

const autoHeightContainer = css`
  & > div {
    height: auto;
  }
`;

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

  // Fetch the data.* field names sampled from recent alert events.
  useEffect(() => {
    http
      .get<string[]>(ALERTING_V2_INTERNAL_SUGGESTIONS_RULE_EVENT_FIELDS_API_PATH)
      .then(setDataFieldNames)
      .catch(() => {
        // Best-effort: autocomplete just won't show data.* field names.
      });
  }, [http]);

  // Fetch field names contributed by the additional episodes data source (e.g. v1 classic alerts).
  useEffect(() => {
    if (!additionalDataSource?.fetchSearchFields) return;
    additionalDataSource
      .fetchSearchFields({ services: { http } })
      .then(setAdditionalSourceFields)
      .catch(() => {
        // Best-effort: autocomplete field list will not include fields from this source.
      });
  }, [additionalDataSource, http]);

  const syntheticDataView = useMemo(() => {
    const dataFields = dataFieldNames.map((name) => ({
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
  }, [dataFieldNames, additionalSourceFields]);

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
        className="euiFieldText--fullWidth"
        suggestionsAbstraction={episodesSearchSuggestionsAbstraction}
        suggestionsDebounceMs={300}
      />
    </div>
  );
};
