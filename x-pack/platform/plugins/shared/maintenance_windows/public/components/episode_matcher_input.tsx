/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { css } from '@emotion/react';
import { MATCHER_CONTEXT_FIELDS } from '@kbn/alerting-v2-schemas';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { Query } from '@kbn/es-query';
import type { SuggestionsAbstraction } from '@kbn/kql/public';
import { useFetchEpisodeDataFields } from '../hooks/use_fetch_episode_data_fields';
import { useKibana } from '../utils/kibana_react';

interface EpisodeMatcherInputProps {
  value: string;
  onChange: (value: string) => void;
  fullWidth?: boolean;
  placeholder?: string;
  'data-test-subj'?: string;
}

const suggestionsAbstraction: SuggestionsAbstraction = {
  type: 'action_policies',
  fields: {},
};

const autoHeightContainer = css`
  & > div {
    height: auto;
  }
`;

/**
 * KQL input for the maintenance window's experimental episode-data filter.
 * Mirrors alerting_v2's MatcherInput so users get autocompletion against the
 * v2 episode matcher context (rule.*, episode_*, data.*).
 *
 * Duplicated rather than imported to avoid a maintenance_windows → alerting_v2
 * dependency (alerting_v2 already requires maintenance_windows for SO access).
 */
export const EpisodeMatcherInput = ({
  value,
  onChange,
  fullWidth,
  placeholder,
  'data-test-subj': dataTestSubj,
}: EpisodeMatcherInputProps) => {
  const {
    services: {
      kql: { QueryStringInput },
    },
  } = useKibana();
  const { data: dataFieldNames } = useFetchEpisodeDataFields();

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
        appName="maintenanceWindows"
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
        suggestionsAbstraction={suggestionsAbstraction}
        suggestionsDebounceMs={300}
      />
    </div>
  );
};
