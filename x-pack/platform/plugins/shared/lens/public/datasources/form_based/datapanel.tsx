/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';
import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { EuiCallOut, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { CoreStart } from '@kbn/core/public';
import type { Query } from '@kbn/es-query';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { FieldSpec } from '@kbn/data-plugin/common';
import { type DataView, DataViewField } from '@kbn/data-plugin/common';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { IndexPatternFieldEditorStart } from '@kbn/data-view-field-editor-plugin/public';
import { VISUALIZE_GEO_FIELD_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import {
  FieldList,
  FieldListFilters,
  FieldListGrouped,
  type FieldListGroupedProps,
  FieldsGroupNames,
  useExistingFieldsFetcher,
  useGroupedFields,
} from '@kbn/unified-field-list';
import type { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import useLatest from 'react-use/lib/useLatest';
import { isFieldLensCompatible } from '@kbn/visualization-ui-components';
import type {
  FormBasedPrivateState,
  DatasourceDataPanelProps,
  FramePublicAPI,
  IndexPattern,
  IndexPatternField,
} from '@kbn/lens-common';
import { buildIndexPatternField } from '../../data_views_service/loader';
import type { IndexPatternServiceAPI } from '../../data_views_service/service';
import { FieldItem } from '../common/field_item';
import { dataPanelStyles } from '../common/datapanel.styles';

export type FormBasedDataPanelProps = Omit<
  DatasourceDataPanelProps<FormBasedPrivateState, Query>,
  'core' | 'onChangeIndexPattern'
> & {
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  fieldFormats: FieldFormatsStart;
  charts: ChartsPluginSetup;
  core: CoreStart;
  indexPatternFieldEditor: IndexPatternFieldEditorStart;
  frame: FramePublicAPI;
  indexPatternService: IndexPatternServiceAPI;
  onIndexPatternRefresh: () => void;
  layerFields?: string[];
};

const supportedFieldTypes = new Set([
  'string',
  'number',
  'boolean',
  'date',
  'ip',
  'number_range',
  'date_range',
  'ip_range',
  'histogram',
  'document',
  'geo_point',
  'geo_shape',
  'murmur3',
]);

function onSupportedFieldFilter(field: IndexPatternField): boolean {
  return supportedFieldTypes.has(field.type);
}

export function FormBasedDataPanel({
  state,
  core,
  data,
  dataViews,
  fieldFormats,
  query,
  filters,
  dateRange,
  charts,
  indexPatternFieldEditor,
  showNoDataPopover,
  dropOntoWorkspace,
  hasSuggestionForField,
  uiActions,
  indexPatternService,
  frame,
  onIndexPatternRefresh,
  usedIndexPatterns,
  layerFields,
}: FormBasedDataPanelProps) {
  const { indexPatterns, indexPatternRefs } = frame.dataViews;
  const { currentIndexPatternId } = state;

  const euiThemeContext = useEuiTheme();
  const activeIndexPatterns = useMemo(() => {
    return uniq(
      (
        usedIndexPatterns ?? Object.values(state.layers).map(({ indexPatternId }) => indexPatternId)
      ).concat(currentIndexPatternId)
    )
      .filter((id) => !!indexPatterns[id])
      .sort()
      .map((id) => indexPatterns[id]);
  }, [usedIndexPatterns, indexPatterns, state.layers, currentIndexPatternId]);

  return (
    <>
      {Object.keys(indexPatterns).length === 0 && indexPatternRefs.length === 0 ? (
        <EuiFlexGroup
          gutterSize="m"
          css={dataPanelStyles(euiThemeContext)}
          direction="column"
          responsive={false}
        >
          <EuiFlexItem grow={null}>
            <EuiCallOut
              announceOnMount={false}
              data-test-subj="indexPattern-no-indexpatterns"
              title={i18n.translate('xpack.lens.indexPattern.noDataViewsLabel', {
                defaultMessage: 'No data views',
              })}
              color="warning"
              iconType="warning"
            >
              <p>
                <FormattedMessage
                  id="xpack.lens.indexPattern.noDataViewDescription"
                  defaultMessage="Please create a data view or switch to another data source"
                />
              </p>
            </EuiCallOut>
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <MemoizedDataPanel
          currentIndexPatternId={currentIndexPatternId}
          query={query}
          dateRange={dateRange}
          filters={filters}
          core={core}
          data={data}
          dataViews={dataViews}
          fieldFormats={fieldFormats}
          charts={charts}
          indexPatternFieldEditor={indexPatternFieldEditor}
          dropOntoWorkspace={dropOntoWorkspace}
          hasSuggestionForField={hasSuggestionForField}
          uiActions={uiActions}
          indexPatternService={indexPatternService}
          onIndexPatternRefresh={onIndexPatternRefresh}
          frame={frame}
          layerFields={layerFields}
          showNoDataPopover={showNoDataPopover}
          activeIndexPatterns={activeIndexPatterns}
        />
      )}
    </>
  );
}

export const InnerFormBasedDataPanel = function InnerFormBasedDataPanel({
  currentIndexPatternId,
  query,
  dateRange,
  filters,
  core,
  data,
  dataViews,
  indexPatternFieldEditor,
  dropOntoWorkspace,
  hasSuggestionForField,
  uiActions,
  indexPatternService,
  frame,
  onIndexPatternRefresh,
  layerFields,
  showNoDataPopover,
  activeIndexPatterns,
}: Omit<
  DatasourceDataPanelProps<unknown, Query>,
  'state' | 'setState' | 'core' | 'onChangeIndexPattern' | 'usedIndexPatterns'
> & {
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  fieldFormats: FieldFormatsStart;
  core: CoreStart;
  currentIndexPatternId: string;
  charts: ChartsPluginSetup;
  frame: FramePublicAPI;
  indexPatternFieldEditor: IndexPatternFieldEditorStart;
  onIndexPatternRefresh: () => void;
  layerFields?: string[];
  activeIndexPatterns: IndexPattern[];
}) {
  const euiThemeContext = useEuiTheme();
  const { indexPatterns } = frame.dataViews;
  const currentIndexPattern = indexPatterns[currentIndexPatternId];

  const { refetchFieldsExistenceInfo, isProcessing } = useExistingFieldsFetcher({
    dataViews: activeIndexPatterns as unknown as DataView[],
    query,
    filters,
    fromDate: dateRange.fromDate,
    toDate: dateRange.toDate,
    services: {
      data,
      dataViews,
      core,
    },
    onNoData: (dataViewId) => {
      if (dataViewId === currentIndexPatternId) {
        showNoDataPopover();
      }
    },
  });

  const visualizeGeoFieldTrigger = uiActions.getTrigger(VISUALIZE_GEO_FIELD_TRIGGER);
  const allFields = useMemo(() => {
    if (!currentIndexPattern) return [];
    return visualizeGeoFieldTrigger
      ? currentIndexPattern.fields
      : currentIndexPattern.fields.filter(
          ({ type }) => type !== 'geo_point' && type !== 'geo_shape'
        );
  }, [currentIndexPattern, visualizeGeoFieldTrigger]);

  const editPermission =
    indexPatternFieldEditor.userPermissions.editIndexPattern() || !currentIndexPattern.isPersisted;

  const onSelectedFieldFilter = useCallback(
    (field: IndexPatternField): boolean => {
      return Boolean(layerFields?.includes(field.name));
    },
    [layerFields]
  );

  const onOverrideFieldGroupDetails = useCallback((groupName: string) => {
    if (groupName === FieldsGroupNames.AvailableFields) {
      return {
        helpText: i18n.translate('xpack.lens.indexPattern.allFieldsLabelHelp', {
          defaultMessage:
            'Drag and drop available fields to the workspace and create visualizations. To change the available fields, select a different data view, edit your queries, or use a different time range. Some field types cannot be visualized in Lens, including full text and geographic fields.',
        }),
      };
    }
  }, []);

  const { fieldListFiltersProps, fieldListGroupedProps, hasNewFields } =
    useGroupedFields<IndexPatternField>({
      dataViewId: currentIndexPatternId,
      allFields,
      services: {
        dataViews,
        core,
      },
      isAffectedByGlobalFilter: Boolean(filters.length),
      onSupportedFieldFilter,
      onSelectedFieldFilter,
      onOverrideFieldGroupDetails,
      getNewFieldsBySpec,
    });

  const closeFieldEditor = useRef<() => void | undefined>();

  useEffect(() => {
    return () => {
      // Make sure to close the editor when unmounting
      if (closeFieldEditor.current) {
        closeFieldEditor.current();
      }
    };
  }, []);

  const refreshFieldList = useLatest(async () => {
    if (currentIndexPattern) {
      const newlyMappedIndexPattern = await indexPatternService.loadIndexPatterns({
        patterns: [currentIndexPattern.id],
        cache: {},
        onIndexPatternRefresh,
      });
      indexPatternService.updateDataViewsState({
        indexPatterns: {
          ...frame.dataViews.indexPatterns,
          [currentIndexPattern.id]: newlyMappedIndexPattern[currentIndexPattern.id],
        },
      });
    }
    // start a new session so all charts are refreshed
    data.search.session.start();
  });

  useEffect(() => {
    if (hasNewFields) {
      refreshFieldList.current();
    }
  }, [hasNewFields, refreshFieldList]);

  const editField = useMemo(
    () =>
      editPermission
        ? async (fieldName?: string, uiAction: 'edit' | 'add' = 'edit') => {
            const indexPatternInstance = await dataViews.get(currentIndexPattern?.id);
            closeFieldEditor.current = await indexPatternFieldEditor.openEditor({
              ctx: {
                dataView: indexPatternInstance,
              },
              fieldName,
              onSave: () => {
                if (indexPatternInstance.isPersisted()) {
                  refreshFieldList.current();
                  refetchFieldsExistenceInfo(indexPatternInstance.id);
                } else {
                  indexPatternService.replaceDataViewId(indexPatternInstance);
                }
              },
            });
          }
        : undefined,
    [
      editPermission,
      dataViews,
      currentIndexPattern?.id,
      indexPatternFieldEditor,
      refreshFieldList,
      indexPatternService,
      refetchFieldsExistenceInfo,
    ]
  );

  const removeField = useMemo(
    () =>
      editPermission
        ? async (fieldName: string) => {
            const indexPatternInstance = await dataViews.get(currentIndexPattern?.id);
            closeFieldEditor.current = await indexPatternFieldEditor.openDeleteModal({
              ctx: {
                dataView: indexPatternInstance,
              },
              fieldName,
              onDelete: () => {
                if (indexPatternInstance.isPersisted()) {
                  refreshFieldList.current();
                  refetchFieldsExistenceInfo(indexPatternInstance.id);
                } else {
                  indexPatternService.replaceDataViewId(indexPatternInstance);
                }
              },
            });
          }
        : undefined,
    [
      currentIndexPattern?.id,
      dataViews,
      editPermission,
      indexPatternFieldEditor,
      indexPatternService,
      refreshFieldList,
      refetchFieldsExistenceInfo,
    ]
  );

  const renderFieldItem: FieldListGroupedProps<IndexPatternField>['renderFieldItem'] = useCallback(
    ({ field, itemIndex, groupIndex, groupName, hideDetails, fieldSearchHighlight }) => (
      <FieldItem
        field={field}
        exists={groupName !== FieldsGroupNames.EmptyFields}
        hideDetails={hideDetails || field.type === 'document'}
        itemIndex={itemIndex}
        groupIndex={groupIndex}
        dropOntoWorkspace={dropOntoWorkspace}
        hasSuggestionForField={hasSuggestionForField}
        editField={editField}
        removeField={removeField}
        indexPattern={currentIndexPattern}
        highlight={fieldSearchHighlight}
        dateRange={dateRange}
        query={query}
        filters={filters}
      />
    ),
    [
      currentIndexPattern,
      dateRange,
      query,
      filters,
      dropOntoWorkspace,
      hasSuggestionForField,
      editField,
      removeField,
    ]
  );

  return (
    <FieldList
      css={dataPanelStyles(euiThemeContext)}
      isProcessing={isProcessing}
      prepend={<FieldListFilters {...fieldListFiltersProps} data-test-subj="lnsIndexPattern" />}
    >
      <FieldListGrouped<IndexPatternField>
        {...fieldListGroupedProps}
        renderFieldItem={renderFieldItem}
        data-test-subj="lnsIndexPattern"
        localStorageKeyPrefix="lens"
      />
    </FieldList>
  );
};

function getNewFieldsBySpec(spec: FieldSpec[], dataView: DataView | null) {
  const metaKeys = dataView ? new Set(dataView.metaFields) : undefined;

  return spec.reduce((result: IndexPatternField[], fieldSpec: FieldSpec) => {
    const field = new DataViewField(fieldSpec);
    if (isFieldLensCompatible(field)) {
      result.push(buildIndexPatternField(field, metaKeys));
    }
    return result;
  }, []);
}

export const MemoizedDataPanel = memo(InnerFormBasedDataPanel);
