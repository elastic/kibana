/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiLoadingSpinner, EuiToolTip } from '@elastic/eui';
import { v4 as uuidv4 } from 'uuid';
import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public/types';
import { getESQLAdHocDataview } from '@kbn/esql-utils';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import type {
  InlineEditLensEmbeddableContext,
  LensPublicStart,
  TypedLensByValueInput,
} from '@kbn/lens-plugin/public';
import type { ChartType } from '@kbn/visualization-utils';
import { getLensAttributesFromSuggestion } from '@kbn/visualization-utils';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import useAsync from 'react-use/lib/useAsync';
import type { TabularDataResult } from '@kbn/onechat-common/tools/tool_result';
import { esFieldTypeToKibanaFieldType } from '@kbn/field-types';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { i18n } from '@kbn/i18n';

const VISUALIZATION_HEIGHT = 240;

const editVisualizationLabel = i18n.translate('xpack.onechat.conversation.visualization.edit', {
  defaultMessage: 'Edit visualization',
});

const saveVisualizationLabel = i18n.translate('xpack.onechat.conversation.visualization.save', {
  defaultMessage: 'Save visualization',
});

const saveToDashboardLabel = i18n.translate(
  'xpack.onechat.conversation.visualization.saveToDashboard',
  { defaultMessage: 'Save to dashboard' }
);

export function VisualizeESQL({
  lens,
  dataViews,
  uiActions,
  esqlColumns,
  esqlQuery,
  preferredChartType,
}: {
  lens: LensPublicStart;
  dataViews: DataViewsServicePublic;
  esqlColumns: TabularDataResult['data']['columns'] | undefined;
  uiActions: UiActionsStart;
  esqlQuery: string;
  preferredChartType?: ChartType;
  errorMessages?: string[];
}) {
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

  const [lensLoadEvent, setLensLoadEvent] = useState<
    InlineEditLensEmbeddableContext['lensEvent'] | null
  >(null);

  const { lensInput, setLensInput } = useLensInput({
    lens,
    dataViews,
    esqlQuery,
    esqlColumns,
    preferredChartType,
  });

  const onLoad = useCallback(
    (
      _isLoading: boolean,
      adapters: InlineEditLensEmbeddableContext['lensEvent']['adapters'] | undefined,
      dataLoading$?: InlineEditLensEmbeddableContext['lensEvent']['dataLoading$']
    ) => {
      const adapterTables = adapters?.tables?.tables;
      if (adapterTables && !_isLoading) {
        setLensLoadEvent({ adapters, dataLoading$ });
      }
    },
    []
  );

  const isLoading = !lensInput;

  return (
    <>
      <EditVisualization
        uiActions={uiActions}
        lensInput={lensInput}
        lensLoadEvent={lensLoadEvent}
        setLensInput={setLensInput}
        onApply={() => setIsSaveModalOpen(true)}
      />

      <EuiToolTip content={saveVisualizationLabel} disableScreenReaderOutput>
        <EuiButtonIcon
          size="xs"
          iconType="save"
          onClick={() => setIsSaveModalOpen(true)}
          aria-label={saveVisualizationLabel}
        />
      </EuiToolTip>

      <div style={{ height: VISUALIZATION_HEIGHT }}>
        {isLoading ? (
          <EuiLoadingSpinner />
        ) : (
          <lens.EmbeddableComponent
            {...lensInput}
            style={{
              height: VISUALIZATION_HEIGHT,
            }}
            onLoad={onLoad}
          />
        )}
      </div>

      {isSaveModalOpen ? (
        <lens.SaveModalComponent
          initialInput={lensInput}
          onClose={() => {
            setIsSaveModalOpen(() => false);
          }}
          isSaveable={false}
        />
      ) : null}
    </>
  );
}

function EditVisualization({
  uiActions,
  lensInput,
  lensLoadEvent,
  setLensInput,
  onApply,
}: {
  uiActions: UiActionsStart;
  lensInput: TypedLensByValueInput | undefined;
  lensLoadEvent: InlineEditLensEmbeddableContext['lensEvent'] | null;
  setLensInput: (input: TypedLensByValueInput) => void;
  onApply: () => void;
}) {
  const triggerOptions: InlineEditLensEmbeddableContext | undefined = useMemo(() => {
    if (lensInput?.attributes) {
      return {
        applyButtonLabel: saveToDashboardLabel,
        attributes: lensInput?.attributes,
        lensEvent: lensLoadEvent ?? { adapters: {} },
        onUpdate: (newAttributes: TypedLensByValueInput['attributes']) => {
          if (lensInput) {
            setLensInput({ ...lensInput, attributes: newAttributes });
          }
        },
        onApply,
        onCancel: () => {},
        container: null,
      };
    }
  }, [lensInput, lensLoadEvent, onApply, setLensInput]);

  return (
    <EuiToolTip content={editVisualizationLabel} disableScreenReaderOutput>
      <EuiButtonIcon
        size="xs"
        iconType="pencil"
        onClick={() => {
          if (triggerOptions) {
            uiActions.getTrigger('IN_APP_EMBEDDABLE_EDIT_TRIGGER').exec(triggerOptions);
          }
        }}
        aria-label={editVisualizationLabel}
      />
    </EuiToolTip>
  );
}

function useLensInput({
  esqlQuery,
  dataViews,
  lens,
  esqlColumns,
  preferredChartType,
}: {
  esqlQuery: string;
  dataViews: DataViewsServicePublic;
  lens: LensPublicStart;
  esqlColumns: TabularDataResult['data']['columns'] | undefined;
  preferredChartType?: ChartType;
}) {
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

  const [lensInput, setLensInput] = useState<TypedLensByValueInput | undefined>();

  const lensHelpersAsync = useAsync(() => lens.stateHelperApi(), [lens]);

  const dataViewAsync = useAsync(() => {
    return getESQLAdHocDataview(esqlQuery, dataViews);
  }, [esqlQuery, dataViews]);

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

        const lensAttributes = getLensAttributesFromSuggestion({
          filters: [],
          query: {
            esql: esqlQuery,
          },
          suggestion,
          dataView: dataViewAsync.value,
        }) as TypedLensByValueInput['attributes'];

        setLensInput({ attributes: lensAttributes, id: uuidv4() });
      }
    }
  }, [
    columns,
    dataViewAsync.value,
    lensHelpersAsync.value,
    lensInput,
    esqlQuery,
    preferredChartType,
    setLensInput,
  ]);

  return { lensInput, setLensInput };
}
