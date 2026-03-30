/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { Query } from '@kbn/es-query';
import type { KqlPluginStart } from '@kbn/kql/public';
import { useService } from '@kbn/core-di-browser';
import { PluginStart } from '@kbn/core-di';
import { MATCHER_CONTEXT_FIELDS } from '@kbn/alerting-v2-schemas';

interface MatcherInputProps {
  value: string;
  onChange: (value: string) => void;
  fullWidth?: boolean;
  placeholder?: string;
  'data-test-subj'?: string;
}

const syntheticDataView = [
  {
    title: '',
    fieldFormatMap: {},
    fields: MATCHER_CONTEXT_FIELDS.map((f) => ({
      name: f.path,
      type: f.type === 'boolean' ? 'boolean' : 'string',
      esTypes: [f.type === 'boolean' ? 'boolean' : 'keyword'],
      searchable: true,
      aggregatable: true,
    })),
  },
] as unknown as DataView[];

export const MatcherInput = ({
  value,
  onChange,
  fullWidth,
  placeholder,
  'data-test-subj': dataTestSubj,
}: MatcherInputProps) => {
  const { QueryStringInput } = useService(PluginStart('kql')) as KqlPluginStart;

  const query: Query = useMemo(() => ({ query: value, language: 'kuery' }), [value]);

  const handleChange = useCallback(
    (q: Query) => onChange(typeof q.query === 'string' ? q.query : ''),
    [onChange]
  );

  return (
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
    />
  );
};
