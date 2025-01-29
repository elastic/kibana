/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useEffect, useState } from 'react';

import type { EMSTermJoinConfig } from '@kbn/maps-plugin/public';

import { useDataVisualizerKibana } from '../../../../../kibana_context';

import { TopValues } from '../../../top_values';

import type { FieldDataRowProps } from '../../types/field_data_row';

import { DocumentStatsTable } from './document_stats';
import { ExpandedRowContent } from './expanded_row_content';
import { ChoroplethMap } from './choropleth_map';
import { ErrorMessageContent } from './error_message';
import { useBarColor } from './use_bar_color';

export const KeywordContent: FC<FieldDataRowProps> = ({ config, onAddFilter }) => {
  const barColor = useBarColor();

  const [suggestion, setSuggestion] = useState<EMSTermJoinConfig | null>(null);
  const { stats, fieldName } = config;
  const fieldFormat = 'fieldFormat' in config ? config.fieldFormat : undefined;
  const {
    services: { maps: mapsPlugin },
  } = useDataVisualizerKibana();

  useEffect(() => {
    if (!mapsPlugin) return;
    if (!stats?.topValues) {
      setSuggestion(null);
      return;
    }

    let ignore = false;
    mapsPlugin
      .suggestEMSTermJoinConfig({
        sampleValues: stats.topValues.map((value) => value.key),
        sampleValuesColumnName: fieldName || '',
      })
      .then((nextSuggestion) => {
        if (!ignore) {
          setSuggestion(nextSuggestion);
        }
      })
      .catch(() => {
        if (!ignore) {
          setSuggestion(null);
        }
      });

    return () => {
      ignore = true;
    };
  }, [fieldName, mapsPlugin, stats?.topValues]);

  return (
    <ExpandedRowContent dataTestSubj={'dataVisualizerKeywordContent'}>
      <DocumentStatsTable config={config} />
      {config.stats?.error && fieldName !== undefined ? (
        <ErrorMessageContent fieldName={fieldName} error={config.stats?.error} />
      ) : null}
      <TopValues
        stats={stats}
        fieldFormat={fieldFormat}
        barColor={barColor}
        onAddFilter={onAddFilter}
      />
      {config.stats?.sampledValues && fieldName !== undefined ? (
        <TopValues
          stats={stats}
          fieldFormat={fieldFormat}
          barColor={barColor}
          onAddFilter={onAddFilter}
          showSampledValues={true}
        />
      ) : null}

      {suggestion && stats && <ChoroplethMap stats={stats} suggestion={suggestion} />}
    </ExpandedRowContent>
  );
};
