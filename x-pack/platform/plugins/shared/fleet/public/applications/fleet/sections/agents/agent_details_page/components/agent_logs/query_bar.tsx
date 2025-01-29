/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';

import type { FieldSpec } from '@kbn/data-plugin/common';
import type { DataView } from '@kbn/data-views-plugin/public';

import { useStartServices } from '../../../../../hooks';

import {
  AGENT_LOG_INDEX_PATTERN,
  AGENT_ID_FIELD,
  DATASET_FIELD,
  LOG_LEVEL_FIELD,
} from './constants';

const EXCLUDED_FIELDS = [AGENT_ID_FIELD.name, DATASET_FIELD.name, LOG_LEVEL_FIELD.name];

export const LogQueryBar: React.FunctionComponent<{
  query: string;
  isQueryValid: boolean;
  onUpdateQuery: (query: string, runQuery?: boolean) => void;
}> = memo(({ query, isQueryValid, onUpdateQuery }) => {
  const {
    data,
    unifiedSearch: {
      ui: { QueryStringInput },
    },
  } = useStartServices();
  const [indexPatternFields, setIndexPatternFields] = useState<FieldSpec[]>();

  useEffect(() => {
    const fetchFields = async () => {
      try {
        const fields = (
          (await data.dataViews.getFieldsForWildcard({
            pattern: AGENT_LOG_INDEX_PATTERN,
          })) || []
        ).filter((field) => {
          return !EXCLUDED_FIELDS.includes(field.name);
        });
        setIndexPatternFields(fields);
      } catch (err) {
        setIndexPatternFields(undefined);
      }
    };
    fetchFields();
  }, [data.dataViews]);

  return (
    <QueryStringInput
      iconType="search"
      autoSubmit={true}
      disableLanguageSwitcher={true}
      indexPatterns={
        indexPatternFields
          ? ([
              {
                title: AGENT_LOG_INDEX_PATTERN,
                fields: indexPatternFields,
              },
            ] as DataView[])
          : []
      }
      query={{
        query,
        language: 'kuery',
      }}
      isInvalid={!isQueryValid}
      disableAutoFocus={true}
      placeholder={i18n.translate('xpack.fleet.agentLogs.searchPlaceholderText', {
        defaultMessage: 'Search logs…',
      })}
      onChange={(newQuery) => {
        onUpdateQuery(newQuery.query as string);
      }}
      onSubmit={(newQuery) => {
        onUpdateQuery(newQuery.query as string, true);
      }}
      appName={i18n.translate('xpack.fleet.appTitle', { defaultMessage: 'Fleet' })}
    />
  );
});
