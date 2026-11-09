/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import { EuiSkeletonText, EuiText, useEuiTheme } from '@elastic/eui';
import { lastValueFrom } from 'rxjs';
import type { estypes } from '@elastic/elasticsearch';
import { i18n } from '@kbn/i18n';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { InlineRenderCallbacks } from '@kbn/agent-builder-browser/attachments';
import { VisualizationPreviewShell } from '@kbn/agent-builder-visualizations';
import { getProcessedFields } from '@kbn/ml-data-grid';
import {
  ANALYSIS_CONFIG_TYPE,
  ML__INCREMENTAL_ID,
  type DataFrameAnalysisConfigType,
} from '@kbn/ml-data-frame-analytics-utils';
import type { MlLocator } from '../locator';
import { VegaChart } from '../application/components/vega_chart';
import { LEGEND_TYPES } from '../application/components/vega_chart/common';
import { getScatterplotMatrixVegaLiteSpec } from '../application/components/scatterplot_matrix/scatterplot_matrix_vega_lite_spec';
import { resultsExplorerAction, resultsExplorerHref } from './results_explorer_link';

const DEFAULT_FIELDS = 4;
const FETCH_SIZE = 1000;
const CHART_PREVIEW_HEIGHT = 400;

export interface InlineScatterplotMatrixServices {
  data: DataPublicPluginStart;
  locator?: MlLocator;
}

export interface InlineScatterplotMatrixData {
  job_id: string;
  analysis_type: DataFrameAnalysisConfigType;
  index: string;
  results_field?: string;
  dependent_variable?: string;
  includes?: string[];
  excludes?: string[];
}

function numericFields(
  dataView: DataView,
  includes: string[] | undefined,
  excludes: string[] | undefined,
  resultsField: string
): string[] {
  const fields =
    includes && includes.length > 1
      ? includes.filter((name) =>
          dataView.fields.some((field) => field.name === name && field.type === 'number')
        )
      : dataView.fields
          .filter(
            (field) =>
              field.type === 'number' &&
              !dataView.metaFields.includes(field.name) &&
              !field.name.startsWith(`${resultsField}.`) &&
              field.name !== ML__INCREMENTAL_ID
          )
          .map((field) => field.name);
  return excludes && excludes.length > 0
    ? fields.filter((field) => !excludes.includes(field))
    : fields;
}

function chartableItems(items: estypes.SearchHit[], resultsField: string) {
  return items
    .map((hit) =>
      getProcessedFields(hit.fields ?? {}, (key: string) =>
        key.startsWith(`${resultsField}.feature_importance`)
      )
    )
    .filter((item) => !Object.keys(item).some((field) => Array.isArray(item[field])));
}

function legendTypeOf(analysisType: DataFrameAnalysisConfigType) {
  if (analysisType === ANALYSIS_CONFIG_TYPE.CLASSIFICATION) {
    return LEGEND_TYPES.NOMINAL;
  }
  if (analysisType === ANALYSIS_CONFIG_TYPE.REGRESSION) {
    return LEGEND_TYPES.QUANTITATIVE;
  }
  return undefined;
}

/** Scatterplot matrix of numeric fields on a data frame analytics destination index. */
export const InlineScatterplotMatrix = ({
  attachmentData,
  services,
  registerActionButtons,
}: {
  attachmentData: InlineScatterplotMatrixData;
  services: InlineScatterplotMatrixServices;
  registerActionButtons?: InlineRenderCallbacks['registerActionButtons'];
}) => {
  const { euiTheme } = useEuiTheme();
  const resultsField = attachmentData.results_field ?? 'ml';
  const color =
    attachmentData.analysis_type === ANALYSIS_CONFIG_TYPE.CLASSIFICATION ||
    attachmentData.analysis_type === ANALYSIS_CONFIG_TYPE.REGRESSION
      ? attachmentData.dependent_variable
      : undefined;
  const viewInHref = resultsExplorerHref(
    services.locator,
    attachmentData.job_id,
    attachmentData.analysis_type
  );
  const actionButtons = useMemo(() => resultsExplorerAction(viewInHref), [viewInHref]);

  const [fields, setFields] = useState<string[]>();
  const [spec, setSpec] = useState<ReturnType<typeof getScatterplotMatrixVegaLiteSpec>>();
  const [message, setMessage] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    async function loadFields() {
      try {
        const dataView = await services.data.dataViews.create({ title: attachmentData.index });
        const nextFields = numericFields(
          dataView,
          attachmentData.includes,
          attachmentData.excludes,
          resultsField
        ).slice(0, DEFAULT_FIELDS);
        if (cancelled) {
          return;
        }
        if (nextFields.length < 2) {
          setFields(undefined);
          setSpec(undefined);
          setMessage(
            i18n.translate('xpack.ml.agentBuilder.dfa.scatterplot.notEnoughFields', {
              defaultMessage: 'The results index needs at least two numeric fields.',
            })
          );
          return;
        }
        setMessage(undefined);
        setFields(nextFields);
      } catch (error) {
        if (!cancelled) {
          setFields(undefined);
          setSpec(undefined);
          setMessage(error instanceof Error ? error.message : String(error));
        }
      }
    }
    loadFields();
    return () => {
      cancelled = true;
    };
  }, [attachmentData, resultsField, services.data]);

  useEffect(() => {
    if (!fields) {
      return;
    }
    const columns = fields;
    let cancelled = false;
    async function loadChart() {
      try {
        const queryFields = [
          ...columns,
          ...(color ? [color] : []),
          `${resultsField}.outlier_score`,
        ];
        const response = (await lastValueFrom(
          services.data.search.search({
            params: {
              index: attachmentData.index,
              body: {
                fields: queryFields,
                _source: false,
                size: FETCH_SIZE,
                query: { match_all: {} },
              },
            },
          })
        )) as { rawResponse?: estypes.SearchResponse };
        if (cancelled) {
          return;
        }
        const isOutlierAnalysis =
          attachmentData.analysis_type === ANALYSIS_CONFIG_TYPE.OUTLIER_DETECTION;
        setSpec(
          getScatterplotMatrixVegaLiteSpec(
            false,
            chartableItems(response.rawResponse?.hits.hits ?? [], resultsField),
            [],
            columns,
            euiTheme,
            isOutlierAnalysis ? resultsField : undefined,
            color,
            legendTypeOf(attachmentData.analysis_type),
            false,
            false
          )
        );
      } catch (error) {
        if (!cancelled) {
          setSpec(undefined);
          setMessage(error instanceof Error ? error.message : String(error));
        }
      }
    }
    loadChart();
    return () => {
      cancelled = true;
    };
  }, [
    attachmentData.analysis_type,
    attachmentData.index,
    color,
    euiTheme,
    fields,
    resultsField,
    services.data,
  ]);

  return (
    <VisualizationPreviewShell
      showTimePicker={false}
      actionButtons={actionButtons}
      registerActionButtons={registerActionButtons}
      height={CHART_PREVIEW_HEIGHT}
      dataTestSubj="mlAgentBuilderScatterplotMatrix"
    >
      {message ? <EuiText size="s">{message}</EuiText> : null}
      {spec ? (
        <div css={css({ height: '100%', overflow: 'auto' })}>
          <VegaChart vegaSpec={spec} />
        </div>
      ) : message ? null : (
        <EuiSkeletonText lines={3} />
      )}
    </VisualizationPreviewShell>
  );
};
