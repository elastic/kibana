/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import { useExpandedRowCss } from './use_expanded_row_css';
import { GeoPointContentWithMap } from './geo_point_content_with_map';
import { SUPPORTED_FIELD_TYPES } from '../../../../../common/constants';
import {
  BooleanContent,
  DateContent,
  IpContent,
  KeywordContent,
  NumberContent,
  OtherContent,
  TextContent,
} from '../stats_table/components/field_data_expanded_row';
import { NotInDocsContent } from '../not_in_docs_content';
import type { FieldVisConfig } from '../stats_table/types';
import type { CombinedQuery } from '../../../index_data_visualizer/types/combined_query';
import { LoadingIndicator } from '../loading_indicator';
import { ErrorMessageContent } from '../stats_table/components/field_data_expanded_row/error_message';
import { NotSupportedContent } from '../not_in_docs_content/not_supported_content';

export const IndexBasedDataVisualizerExpandedRow = ({
  item,
  dataView,
  combinedQuery,
  onAddFilter,
  esql,
  totalDocuments,
  timeFieldName,
  typeAccessor = 'type',
  onVisibilityChange,
}: {
  item: FieldVisConfig;
  dataView: DataView | undefined;
  combinedQuery?: CombinedQuery;
  esql?: string;
  totalDocuments?: number;
  typeAccessor?: 'type' | 'secondaryType';
  /**
   * Callback to add a filter to filter bar
   */
  onAddFilter?: (field: DataViewField | string, value: string, type: '+' | '-') => void;
  timeFieldName?: string;
  onVisibilityChange?: (visible: boolean, item: FieldVisConfig) => void;
}) => {
  const config = { ...item, stats: { ...item.stats, totalDocuments } };
  const { loading, existsInDocs, fieldName } = config;
  const type = config[typeAccessor];
  const dvExpandedRow = useExpandedRowCss();

  function getCardContent() {
    if (type === 'unknown' || type.includes('vector') || item.secondaryType?.includes('vector')) {
      return <NotSupportedContent />;
    }

    if (existsInDocs === false) {
      return <NotInDocsContent />;
    }

    if (config.stats?.error) {
      return <ErrorMessageContent fieldName={fieldName} error={config.stats?.error} />;
    }

    switch (type) {
      case SUPPORTED_FIELD_TYPES.NUMBER:
        return <NumberContent config={config} onAddFilter={onAddFilter} />;

      case SUPPORTED_FIELD_TYPES.BOOLEAN:
        return <BooleanContent config={config} onAddFilter={onAddFilter} />;

      case SUPPORTED_FIELD_TYPES.DATE:
        return <DateContent config={config} />;

      case SUPPORTED_FIELD_TYPES.GEO_POINT:
      case SUPPORTED_FIELD_TYPES.GEO_SHAPE:
        return (
          <GeoPointContentWithMap
            config={config}
            dataView={dataView}
            combinedQuery={combinedQuery}
            esql={esql}
            timeFieldName={timeFieldName}
          />
        );

      case SUPPORTED_FIELD_TYPES.IP:
        return <IpContent config={config} onAddFilter={onAddFilter} />;

      case SUPPORTED_FIELD_TYPES.KEYWORD:
      case SUPPORTED_FIELD_TYPES.VERSION:
        return <KeywordContent config={config} onAddFilter={onAddFilter} />;

      case SUPPORTED_FIELD_TYPES.TEXT:
        return <TextContent config={config} />;

      default:
        return <OtherContent config={config} />;
    }
  }

  useEffect(() => {
    onVisibilityChange?.(true, item);

    return () => {
      onVisibilityChange?.(false, item);
    };
  }, [item, onVisibilityChange]);

  return (
    <div css={dvExpandedRow} data-test-subj={`dataVisualizerFieldExpandedRow-${fieldName}`}>
      {loading === true ? <LoadingIndicator /> : getCardContent()}
    </div>
  );
};
