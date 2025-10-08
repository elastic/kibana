/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import { v4 as uuidv4 } from 'uuid';
import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public/types';
import { getESQLAdHocDataview } from '@kbn/esql-utils';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import type { LensPublicStart, TypedLensByValueInput } from '@kbn/lens-plugin/public';

import type { ChartType } from '@kbn/visualization-utils';
import { getLensAttributesFromSuggestion } from '@kbn/visualization-utils';
import React, { useEffect, useMemo, useState } from 'react';
import useAsync from 'react-use/lib/useAsync';
import type { TabularDataResult } from '@kbn/onechat-common/tools/tool_result';
import { esFieldTypeToKibanaFieldType } from '@kbn/field-types';

const VISUALIZATION_HEIGHT = 240;

interface VisualizeESQLProps {
  lens: LensPublicStart;
  dataViews: DataViewsServicePublic;
  esqlColumns: TabularDataResult['data']['columns'] | undefined;
  esqlQuery: string;
  preferredChartType?: ChartType;
  errorMessages?: string[];
}

export function VisualizeESQL({
  lens,
  dataViews,
  esqlColumns,
  esqlQuery,
  preferredChartType,
}: VisualizeESQLProps) {
  const columns = useMemo(
    () =>
      esqlColumns?.map((column) => {
        return {
          id: column.name,
          name: column.name,
          meta: { type: esFieldTypeToKibanaFieldType(column.type) },
        };
      }) as DatatableColumn[],
    [esqlColumns]
  );

  const lensHelpersAsync = useAsync(() => {
    return lens.stateHelperApi();
  }, [lens]);

  const dataViewAsync = useAsync(() => {
    return getESQLAdHocDataview(esqlQuery, dataViews);
  }, [esqlQuery, dataViews]);

  const [lensInput, setLensInput] = useState<TypedLensByValueInput | undefined>();

  // initialization
  useEffect(() => {
    if (lensHelpersAsync.value && dataViewAsync.value && !lensInput) {
      const context = {
        dataViewSpec: dataViewAsync.value?.toSpec(),
        fieldName: '',
        textBasedColumns: columns,
        query: {
          esql: esqlQuery,
        },
      };

      const chartSuggestions = lensHelpersAsync.value.suggestions(
        context,
        dataViewAsync.value,
        [],
        preferredChartType
      );

      if (chartSuggestions?.length) {
        const [suggestion] = chartSuggestions;

        const attrs = getLensAttributesFromSuggestion({
          filters: [],
          query: {
            esql: '',
          },
          suggestion,
          dataView: dataViewAsync.value,
        }) as TypedLensByValueInput['attributes'];

        const lensEmbeddableInput = {
          attributes: attrs,
          id: uuidv4(),
        };
        setLensInput(lensEmbeddableInput);
      }
    }
  }, [
    columns,
    dataViewAsync.value,
    lensHelpersAsync.value,
    lensInput,
    esqlQuery,
    preferredChartType,
  ]);

  const isLoading = !lensHelpersAsync.value || !dataViewAsync.value || !lensInput;

  return (
    <div style={{ height: VISUALIZATION_HEIGHT }}>
      {isLoading ? (
        <EuiLoadingSpinner />
      ) : (
        <lens.EmbeddableComponent
          {...lensInput}
          style={{
            height: VISUALIZATION_HEIGHT,
          }}
        />
      )}
    </div>
  );
}
