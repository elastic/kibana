/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem } from '@elastic/eui';
import { AggregateQuery, Query, isOfAggregateQueryType } from '@kbn/es-query';
import { DefaultInspectorAdapters } from '@kbn/expressions-plugin/common';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import { isEqual } from 'lodash';
import { MutableRefObject, useCallback, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { ESQLLangEditor } from '@kbn/esql/public';
import type { ESQLControlVariable } from '@kbn/esql-types';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { DataViewSpec } from '@kbn/data-views-plugin/common';
import { getActiveDataFromDatatable } from '../../../state_management/shared_logic';
import type { Simplify } from '../../../types';
import { onActiveDataChange, useLensDispatch } from '../../../state_management';
import {
  ESQLDataGridAttrs,
  getSuggestions,
} from '../../../app_plugin/shared/edit_on_the_fly/helpers';
import { useESQLVariables } from '../../../app_plugin/shared/edit_on_the_fly/use_esql_variables';
import { MAX_NUM_OF_COLUMNS } from '../../../datasources/text_based/utils';
import { isApiESQLVariablesCompatible } from '../../../react_embeddable/types';
import type { LayerPanelProps } from './types';
import { ESQLDataGridAccordion } from '../../../app_plugin/shared/edit_on_the_fly/esql_data_grid_accordion';

export type ESQLEditorProps = Simplify<
  {
    isTextBasedLanguage: boolean;
  } & Pick<
    LayerPanelProps,
    | 'attributes'
    | 'framePublicAPI'
    | 'datasourceMap'
    | 'lensAdapters'
    | 'parentApi'
    | 'layerId'
    | 'panelId'
    | 'closeFlyout'
    | 'data'
    | 'canEditTextBasedQuery'
    | 'editorContainer'
    | 'visualizationMap'
    | 'setCurrentAttributes'
    | 'updateSuggestion'
    | 'dataLoading$'
    | 'parentApi'
  >
>;

export function ESQLEditor({
  data,
  attributes,
  framePublicAPI,
  isTextBasedLanguage,
  datasourceMap,
  visualizationMap,
  lensAdapters,
  parentApi,
  panelId,
  layerId,
  closeFlyout,
  editorContainer,
  canEditTextBasedQuery,
  dataLoading$,
  setCurrentAttributes,
  updateSuggestion,
}: ESQLEditorProps) {
  const prevQuery = useRef<AggregateQuery | Query>(attributes?.state.query || { esql: '' });
  const [query, setQuery] = useState<AggregateQuery | Query>(
    attributes?.state.query || { esql: '' }
  );
  const [errors, setErrors] = useState<Error[]>([]);
  const [isLayerAccordionOpen, setIsLayerAccordionOpen] = useState(true);
  const [suggestsLimitedColumns, setSuggestsLimitedColumns] = useState(false);
  const [isVisualizationLoading, setIsVisualizationLoading] = useState(false);
  const [dataGridAttrs, setDataGridAttrs] = useState<ESQLDataGridAttrs | undefined>(undefined);
  const [isSuggestionsAccordionOpen, setIsSuggestionsAccordionOpen] = useState(false);
  const [isESQLResultsAccordionOpen, setIsESQLResultsAccordionOpen] = useState(false);

  const adHocDataViews =
    attributes && attributes.state.adHocDataViews
      ? Object.values(attributes.state.adHocDataViews)
      : Object.values(framePublicAPI.dataViews.indexPatterns).map((index) => index.spec);

  const previousAdapters = useRef<Partial<DefaultInspectorAdapters> | undefined>(lensAdapters);

  const esqlVariables = useStateFromPublishingSubject(
    isApiESQLVariablesCompatible(parentApi) ? parentApi?.esqlVariables$ : undefined
  );

  const dispatch = useLensDispatch();

  useEffect(() => {
    const s = dataLoading$?.subscribe((isDataLoading) => {
      // go thru only when the loading is complete
      if (isDataLoading) {
        return;
      }
      const activeData = getActiveDataFromDatatable(
        layerId,
        previousAdapters.current?.tables?.tables
      );
      const table = activeData?.[layerId];

      if (table) {
        // there are cases where a query can return a big amount of columns
        // at this case we don't suggest all columns in a table but the first `MAX_NUM_OF_COLUMNS`
        setSuggestsLimitedColumns(table.columns.length >= MAX_NUM_OF_COLUMNS);
      }

      if (Object.keys(activeData).length > 0) {
        dispatch(onActiveDataChange({ activeData }));
      }
    });
    return () => s?.unsubscribe();
  }, [dataLoading$, dispatch, layerId]);

  const runQuery = useCallback(
    async (q: AggregateQuery, abortController?: AbortController, shouldUpdateAttrs?: boolean) => {
      const attrs = await getSuggestions(
        q,
        data,
        datasourceMap,
        visualizationMap,
        adHocDataViews,
        setErrors,
        abortController,
        setDataGridAttrs,
        esqlVariables,
        shouldUpdateAttrs
      );
      if (attrs) {
        setCurrentAttributes?.(attrs);
        setErrors([]);
        updateSuggestion?.(attrs);
      }
      prevQuery.current = q;
      setIsVisualizationLoading(false);
    },
    [
      data,
      datasourceMap,
      visualizationMap,
      adHocDataViews,
      esqlVariables,
      setCurrentAttributes,
      updateSuggestion,
    ]
  );

  useEffect(() => {
    const abortController = new AbortController();
    const initializeChart = async () => {
      if (isTextBasedLanguage && isOfAggregateQueryType(query) && !dataGridAttrs) {
        try {
          await runQuery(query, abortController, Boolean(attributes?.state.needsRefresh));
        } catch (e) {
          setErrors([e]);
          prevQuery.current = query;
        }
      }
    };
    initializeChart();
  }, [
    adHocDataViews,
    runQuery,
    esqlVariables,
    query,
    data,
    dataGridAttrs,
    attributes?.state.needsRefresh,
    isTextBasedLanguage,
  ]);

  // Early exit if it's not in TextBased mode
  if (!isTextBasedLanguage || !canEditTextBasedQuery || !isOfAggregateQueryType(query)) {
    return null;
  }

  const EditorComponent = (
    <>
      <InnerESQLEditor
        query={query}
        prevQuery={prevQuery}
        setQuery={setQuery}
        runQuery={runQuery}
        adHocDataViews={adHocDataViews}
        errors={errors}
        suggestsLimitedColumns={suggestsLimitedColumns}
        isVisualizationLoading={isVisualizationLoading}
        esqlVariables={esqlVariables}
        closeFlyout={closeFlyout}
        panelId={panelId}
        attributes={attributes}
        parentApi={parentApi}
      />
      {dataGridAttrs ? (
        <ESQLDataGridAccordion
          dataGridAttrs={dataGridAttrs}
          isAccordionOpen={isESQLResultsAccordionOpen}
          isTableView={attributes?.visualizationType !== 'lnsDatatable'}
          setIsAccordionOpen={setIsESQLResultsAccordionOpen}
          query={query}
          onAccordionToggleCb={(status) => {
            if (status && isSuggestionsAccordionOpen) {
              setIsSuggestionsAccordionOpen(!status);
            }
            if (status && isLayerAccordionOpen) {
              setIsLayerAccordionOpen(!status);
            }
          }}
        />
      ) : null}
    </>
  );

  if (editorContainer) {
    return <>{ReactDOM.render(EditorComponent, editorContainer)}</>;
  }
  return EditorComponent;
}

type InnerEditorProps = Simplify<
  {
    query: AggregateQuery;
    prevQuery: MutableRefObject<AggregateQuery | Query>;
    setQuery: (query: AggregateQuery | Query) => void;
    runQuery: (
      q: AggregateQuery,
      abortController?: AbortController,
      shouldUpdateAttrs?: boolean
    ) => Promise<void>;
    errors: Error[];
    isVisualizationLoading: boolean | undefined;
    suggestsLimitedColumns: boolean;
    adHocDataViews: DataViewSpec[];
    esqlVariables: ESQLControlVariable[] | undefined;
  } & Pick<LayerPanelProps, 'attributes' | 'parentApi' | 'panelId' | 'closeFlyout'>
>;

function InnerESQLEditor({
  query,
  adHocDataViews,
  errors,
  suggestsLimitedColumns,
  attributes,
  parentApi,
  panelId,
  closeFlyout,
  setQuery,
  isVisualizationLoading,
  prevQuery,
  runQuery,
  esqlVariables,
}: InnerEditorProps) {
  const { onSaveControl, onCancelControl } = useESQLVariables({
    parentApi,
    panelId,
    attributes,
    closeFlyout,
  });

  const hideTimeFilterInfo = false;
  return (
    <EuiFlexItem grow={false} data-test-subj="InlineEditingESQLEditor">
      <ESQLLangEditor
        query={query}
        onTextLangQueryChange={setQuery}
        detectedTimestamp={adHocDataViews?.[0]?.timeFieldName}
        hideTimeFilterInfo={hideTimeFilterInfo}
        errors={errors}
        warning={
          suggestsLimitedColumns
            ? i18n.translate('xpack.lens.config.configFlyoutCallout', {
                defaultMessage:
                  'Displaying a limited portion of the available fields. Add more from the configuration panel.',
              })
            : undefined
        }
        editorIsInline
        hideRunQueryText
        onTextLangQuerySubmit={async (q, a) => {
          // do not run the suggestions if the query is the same as the previous one
          if (q && !isEqual(q, prevQuery.current)) {
            // setIsVisualizationLoading(true);
            await runQuery(q, a);
          }
        }}
        isDisabled={false}
        allowQueryCancellation
        isLoading={isVisualizationLoading}
        supportsControls={parentApi !== undefined}
        esqlVariables={esqlVariables}
        onCancelControl={onCancelControl}
        onSaveControl={onSaveControl}
      />
    </EuiFlexItem>
  );
}
