/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { EuiPanel, EuiSkeletonText, EuiTitle } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { ANNOTATIONS_SOURCE_SUFFIX } from '@kbn/custom-app-common';
import type { CapabilityQueryResult, CapabilityViewProps } from '@kbn/custom-app-registry';
import type { ChartNode } from '../../../common/custom_app/chart/manifest';
import { applyAccentToChart } from './accent_chart_colors';
import { addAnnotationsToChart } from './chart_annotations';
import { getClickedRow } from './clicked_row';
import { useChartAttributes } from './use_chart_attributes';
import { getServices } from './services';

/** A chart is this tall everywhere: its look is not the author's to decide. */
const CHART_HEIGHT = 280;

type Props = CapabilityViewProps<ChartNode>;

const Chart = ({
  node,
  data,
  annotationData,
  context,
  esqlVariables,
  accentColor,
  runActions,
}: Pick<Props, 'node' | 'context' | 'esqlVariables' | 'accentColor' | 'runActions'> & {
  data: CapabilityQueryResult;
  /** The rows to mark on the chart, when it has annotations that are to be shown now. */
  annotationData?: CapabilityQueryResult;
}) => {
  const { lens } = getServices();
  const { attributes: lensAttributes, error } = useChartAttributes(node, data.columns);
  const { annotations } = node;
  const attributes = useMemo(() => {
    if (!lensAttributes) return undefined;
    const coloured = applyAccentToChart(lensAttributes, accentColor);
    return annotations && annotationData
      ? addAnnotationsToChart(coloured, annotationData, annotations)
      : coloured;
  }, [lensAttributes, accentColor, annotations, annotationData]);
  // One id for as long as the chart is shown, so Lens keeps its own state between refreshes.
  const id = useMemo(() => uuidv4(), []);

  if (error) {
    return (
      <KbnDangerCallout
        size="s"
        announceOnMount={false}
        title={i18n.translate('xpack.lens.customApp.chart.errorTitle', {
          defaultMessage: 'This chart cannot be shown',
        })}
      >
        <p>{error.message}</p>
      </KbnDangerCallout>
    );
  }
  if (!attributes) return null;

  const isClickable = node.onClick.length > 0;

  return (
    <div css={css({ height: CHART_HEIGHT })} data-test-subj="customAppChart">
      <lens.EmbeddableComponent
        id={id}
        attributes={attributes}
        timeRange={context?.timeRange}
        filters={context?.filters}
        esqlVariables={esqlVariables}
        searchSessionId={context?.searchSessionId}
        style={{ height: '100%' }}
        noPadding
        // A chart that has actions of its own does them when it is clicked, and not what a
        // dashboard does by default, which is to offer to filter the dashboard by what was clicked.
        {...(isClickable
          ? {
              onFilter: (event) => {
                event.preventDefault();
                const row = getClickedRow(event);
                if (row) runActions(node.onClick, { row });
              },
            }
          : {})}
      />
    </div>
  );
};

export const LensChartView = ({
  node,
  text,
  context,
  esqlVariables,
  source,
  sources,
  retry,
  accentColor,
  runActions,
}: Props) => {
  const annotations = sources[ANNOTATIONS_SOURCE_SUFFIX];
  const isShown = node.annotations?.visible !== false;
  const annotationData =
    isShown && annotations?.status === 'success' ? annotations.data : undefined;

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="m" data-node-id={node.id}>
      {node.title ? (
        <EuiTitle size="xxs">
          <h4>{text(node.title)}</h4>
        </EuiTitle>
      ) : null}
      {(!source || source.status === 'loading') && <EuiSkeletonText lines={2} isLoading />}
      {source?.status === 'error' && (
        <KbnDangerCallout
          announceOnMount={false}
          size="s"
          title={i18n.translate('xpack.lens.customApp.chart.dataErrorTitle', {
            defaultMessage: 'Unable to load data',
          })}
          actionProps={{
            primary: {
              children: i18n.translate('xpack.lens.customApp.chart.retry', {
                defaultMessage: 'Retry',
              }),
              onClick: retry,
            },
          }}
        >
          <p>{source.message}</p>
        </KbnDangerCallout>
      )}
      {source?.status === 'success' && (
        <Chart
          node={node}
          data={source.data}
          annotationData={annotationData}
          context={context}
          esqlVariables={esqlVariables}
          accentColor={accentColor}
          runActions={runActions}
        />
      )}
    </EuiPanel>
  );
};
