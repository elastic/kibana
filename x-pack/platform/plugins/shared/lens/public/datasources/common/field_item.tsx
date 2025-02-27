/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './field_item.scss';

import React, { useCallback, useState, useMemo } from 'react';
import { EuiText, EuiButton, EuiPopoverFooter } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { Filter, Query } from '@kbn/es-query';
import { DataViewField, type DataView } from '@kbn/data-views-plugin/common';
import {
  AddFieldFilterHandler,
  FieldStats,
  FieldPopover,
  FieldPopoverHeader,
  FieldPopoverFooter,
  FieldItemButton,
  type GetCustomFieldType,
} from '@kbn/unified-field-list';
import { Draggable } from '@kbn/dom-drag-drop';
import { generateFilters, getEsQueryConfig } from '@kbn/data-plugin/public';
import { type DatatableColumn } from '@kbn/expressions-plugin/common';
import { DatasourceDataPanelProps } from '../../types';
import type { IndexPattern, IndexPatternField } from '../../types';
import type { LensAppServices } from '../../app_plugin/types';
import { APP_ID, DOCUMENT_FIELD_NAME } from '../../../common/constants';
import { combineQueryAndFilters } from '../../app_plugin/show_underlying_data';
import { getFieldItemActions } from './get_field_item_actions';

type LensFieldListItem = IndexPatternField | DatatableColumn | DataViewField;

function isTextBasedColumnField(field: LensFieldListItem): field is DatatableColumn {
  return !('type' in field) && Boolean(field?.meta.type);
}

interface FieldItemBaseProps {
  highlight?: string;
  exists: boolean;
  hideDetails?: boolean;
  itemIndex: number;
  groupIndex: number;
  dropOntoWorkspace: DatasourceDataPanelProps['dropOntoWorkspace'];
  hasSuggestionForField: DatasourceDataPanelProps['hasSuggestionForField'];
}

export interface FieldItemIndexPatternFieldProps extends FieldItemBaseProps {
  field: IndexPatternField;
  indexPattern: IndexPattern;
  query: Query;
  dateRange: DatasourceDataPanelProps['dateRange'];
  filters: Filter[];
  editField?: (name: string) => void;
  removeField?: (name: string) => void;
  getCustomFieldType?: never;
}

export interface FieldItemDatatableColumnProps extends FieldItemBaseProps {
  field: DatatableColumn;
  indexPattern?: never;
  query?: never;
  dateRange?: never;
  filters?: never;
  editField?: never;
  removeField?: never;
  getCustomFieldType: GetCustomFieldType<DatatableColumn>;
}

export type FieldItemProps = FieldItemIndexPatternFieldProps | FieldItemDatatableColumnProps;

export function InnerFieldItem(props: FieldItemProps) {
  const {
    query,
    filters,
    field,
    indexPattern,
    highlight,
    exists,
    hideDetails,
    itemIndex,
    groupIndex,
    dropOntoWorkspace,
    hasSuggestionForField,
    editField,
    removeField,
    getCustomFieldType,
  } = props;
  const dataViewField = useMemo(() => {
    // DatatableColumn type
    if (isTextBasedColumnField(field)) {
      return new DataViewField({
        name: field.name,
        type: field.meta?.type ?? 'unknown',
        searchable: true,
        aggregatable: true,
      });
    }
    // IndexPatternField type
    return new DataViewField(field);
  }, [field]);
  const services = useKibana<LensAppServices>().services;
  const filterManager = services?.data?.query?.filterManager;
  const [infoIsOpen, setOpen] = useState(false);

  const togglePopover = useCallback(() => {
    setOpen((value) => !value);
  }, [setOpen]);

  const closePopover = useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  const addFilterAndClose: AddFieldFilterHandler | undefined = useMemo(
    () =>
      filterManager && indexPattern
        ? (clickedField, values, operation) => {
            closePopover();
            const newFilters = generateFilters(
              filterManager,
              clickedField,
              values,
              operation,
              indexPattern
            );
            filterManager.addFilters(newFilters);
          }
        : undefined,
    [indexPattern, filterManager, closePopover]
  );

  const editFieldAndClose = useMemo(
    () =>
      editField && dataViewField.name !== DOCUMENT_FIELD_NAME
        ? (name: string) => {
            closePopover();
            editField(name);
          }
        : undefined,
    [editField, closePopover, dataViewField.name]
  );

  const removeFieldAndClose = useMemo(
    () =>
      removeField
        ? (name: string) => {
            closePopover();
            removeField(name);
          }
        : undefined,
    [removeField, closePopover]
  );

  const indexPatternId = indexPattern?.id;
  const value = useMemo(
    () =>
      isTextBasedColumnField(field)
        ? {
            field: field.name,
            id: field.id,
            humanData: { label: field.name },
          }
        : {
            field,
            indexPatternId,
            id: field.name,
            humanData: {
              label: field.displayName,
              position: itemIndex + 1,
            },
          },
    [field, indexPatternId, itemIndex]
  );

  const order = useMemo(() => [0, groupIndex, itemIndex], [groupIndex, itemIndex]);

  const { buttonAddFieldToWorkspaceProps, onAddFieldToWorkspace } = getFieldItemActions({
    value,
    hasSuggestionForField,
    dropOntoWorkspace,
    closeFieldPopover: closePopover,
  });

  const commonFieldItemButtonProps = {
    isSelected: false, // multiple selections are allowed
    isEmpty: !exists,
    isActive: infoIsOpen,
    withDragIcon: true,
    fieldSearchHighlight: highlight,
    onClick: togglePopover,
    buttonAddFieldToWorkspaceProps,
    onAddFieldToWorkspace,
  };

  const renderFooter = useMemo(() => {
    if (hideDetails || !indexPattern) {
      return;
    }

    if (dataViewField.type === 'geo_point' || dataViewField.type === 'geo_shape') {
      return () => (
        <FieldPopoverFooter
          field={dataViewField}
          dataView={{ ...indexPattern, toSpec: () => indexPattern.spec } as unknown as DataView}
          originatingApp={APP_ID}
          uiActions={services.uiActions}
          buttonProps={{
            'data-test-subj': `lensVisualize-GeoField-${dataViewField.name}`,
          }}
        />
      );
    }

    return function ExplorerInDiscover() {
      const exploreInDiscover = useMemo(
        () =>
          getExploreInDiscover({
            query,
            filters,
            indexPattern,
            dataViewField,
            services,
          }),
        []
      );

      return exploreInDiscover ? (
        <EuiPopoverFooter>
          <EuiButton
            fullWidth
            size="s"
            href={exploreInDiscover}
            target="_blank"
            data-test-subj={`lnsFieldListPanel-exploreInDiscover-${dataViewField.name}`}
          >
            {i18n.translate('xpack.lens.indexPattern.fieldExploreInDiscover', {
              defaultMessage: 'Explore in Discover',
            })}
          </EuiButton>
        </EuiPopoverFooter>
      ) : null;
    };
  }, [dataViewField, filters, hideDetails, indexPattern, query, services]);

  return (
    <li>
      <FieldPopover
        isOpen={infoIsOpen}
        closePopover={closePopover}
        panelClassName="lnsFieldItem__fieldPanel"
        initialFocus=".lnsFieldItem__fieldPanel"
        data-test-subj="lnsFieldListPanelField"
        panelProps={{
          'data-test-subj': 'lnsFieldListPanelFieldContent',
        }}
        container={document.querySelector<HTMLElement>('.application') || undefined}
        button={
          <Draggable
            dragType="copy"
            value={value}
            order={order}
            onDragStart={closePopover}
            dataTestSubj={`lnsFieldListPanelField-${field.name}`}
            dragClassName="unifiedFieldListItemButton__dragging"
          >
            {isTextBasedColumnField(field) ? (
              <FieldItemButton<DatatableColumn>
                field={field}
                getCustomFieldType={getCustomFieldType}
                {...commonFieldItemButtonProps}
              />
            ) : (
              <FieldItemButton field={field} {...commonFieldItemButtonProps} />
            )}
          </Draggable>
        }
        renderHeader={() => {
          return (
            <FieldPopoverHeader
              field={dataViewField}
              closePopover={closePopover}
              buttonAddFieldToWorkspaceProps={buttonAddFieldToWorkspaceProps}
              onAddFieldToWorkspace={onAddFieldToWorkspace}
              onAddFilter={addFilterAndClose}
              onEditField={editFieldAndClose}
              onDeleteField={removeFieldAndClose}
            />
          );
        }}
        renderContent={
          !hideDetails
            ? () => (
                <FieldItemPopoverContents
                  {...props}
                  dataViewField={dataViewField}
                  onAddFilter={addFilterAndClose}
                />
              )
            : undefined
        }
        renderFooter={renderFooter}
      />
    </li>
  );
}

export const FieldItem = React.memo(InnerFieldItem) as typeof InnerFieldItem;

function FieldItemPopoverContents(
  props: FieldItemProps & {
    dataViewField: DataViewField;
    onAddFilter: AddFieldFilterHandler | undefined;
  }
) {
  const { query, filters, indexPattern, dataViewField, dateRange, onAddFilter } = props;
  const services = useKibana<LensAppServices>().services;

  if (!indexPattern) {
    return null;
  }

  return (
    <FieldStats
      services={services}
      query={query}
      filters={filters}
      fromDate={dateRange.fromDate}
      toDate={dateRange.toDate}
      dataViewOrDataViewId={indexPattern.id} // TODO: Refactor to pass a variable with DataView type instead of IndexPattern
      onAddFilter={onAddFilter}
      field={dataViewField}
      data-test-subj="lnsFieldListPanel"
      overrideMissingContent={(params) => {
        if (params.reason === 'no-data') {
          // TODO: should we replace this with a default message "Analysis is not available for this field?"
          return (
            <EuiText size="s" data-test-subj="lnsFieldListPanel-missingFieldStats">
              {i18n.translate('xpack.lens.indexPattern.fieldStatsNoData', {
                defaultMessage:
                  'Lens is unable to create visualizations with this field because it does not contain data. To create a visualization, drag and drop a different field.',
              })}
            </EuiText>
          );
        }
        if (params.reason === 'unsupported') {
          return (
            <EuiText data-test-subj="lnsFieldListPanel-missingFieldStats">{params.element}</EuiText>
          );
        }
        return params.element;
      }}
    />
  );
}

function getExploreInDiscover({
  query,
  filters,
  indexPattern,
  dataViewField,
  services,
}: Pick<FieldItemProps, 'query'> & {
  filters: NonNullable<FieldItemProps['filters']>;
  indexPattern: NonNullable<FieldItemProps['indexPattern']>;
  dataViewField: DataViewField;
  services: LensAppServices;
}) {
  const meta = {
    id: indexPattern.id,
    columns: [dataViewField.name],
    filters: {
      enabled: {
        lucene: [],
        kuery: [],
      },
      disabled: {
        lucene: [],
        kuery: [],
      },
    },
  };
  const { filters: newFilters, query: newQuery } = combineQueryAndFilters(
    query,
    filters,
    meta,
    [indexPattern],
    getEsQueryConfig(services.uiSettings)
  );
  const discoverLocator = services.share?.url.locators.get('DISCOVER_APP_LOCATOR');
  if (!discoverLocator || !services.application.capabilities.discover_v2.show) {
    return;
  }
  return discoverLocator.getRedirectUrl({
    dataViewSpec: indexPattern?.spec,
    timeRange: services.data.query.timefilter.timefilter.getTime(),
    filters: newFilters,
    query: newQuery,
    columns: meta.columns,
  });
}
