/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uniq, indexBy } from 'lodash';
import React, { useState, useEffect, memo, useCallback } from 'react';
import {
  // @ts-ignore
  EuiHighlight,
  EuiFlexGroup,
  EuiFlexItem,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiContextMenuPanelProps,
  EuiPopover,
  EuiPopoverTitle,
  EuiPopoverFooter,
  EuiCallOut,
  EuiText,
  EuiFormControlLayout,
  EuiSwitch,
  EuiFacetButton,
  EuiIcon,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { DatasourceDataPanelProps, DataType, StateSetter } from '../types';
import { ChildDragDropProvider, DragContextState } from '../drag_drop';
import { FieldItem } from './field_item';
import {
  IndexPattern,
  IndexPatternPrivateState,
  IndexPatternField,
  IndexPatternRef,
} from './types';
import { trackUiEvent } from '../lens_ui_telemetry';
import { syncExistingFields } from './loader';
import { fieldExists } from './pure_helpers';

export type Props = DatasourceDataPanelProps<IndexPatternPrivateState> & {
  changeIndexPattern: (
    id: string,
    state: IndexPatternPrivateState,
    setState: StateSetter<IndexPatternPrivateState>
  ) => void;
};
import { LensFieldIcon } from './lens_field_icon';
import { ChangeIndexPattern } from './change_indexpattern';

// TODO the typings for EuiContextMenuPanel are incorrect - watchedItemProps is missing. This can be removed when the types are adjusted
const FixedEuiContextMenuPanel = (EuiContextMenuPanel as unknown) as React.FunctionComponent<
  EuiContextMenuPanelProps & { watchedItemProps: string[] }
>;

function sortFields(fieldA: IndexPatternField, fieldB: IndexPatternField) {
  return fieldA.name.localeCompare(fieldB.name, undefined, { sensitivity: 'base' });
}

const supportedFieldTypes = new Set(['string', 'number', 'boolean', 'date', 'ip']);
const PAGINATION_SIZE = 50;

const fieldTypeNames: Record<DataType, string> = {
  string: i18n.translate('xpack.lens.datatypes.string', { defaultMessage: 'string' }),
  number: i18n.translate('xpack.lens.datatypes.number', { defaultMessage: 'number' }),
  boolean: i18n.translate('xpack.lens.datatypes.boolean', { defaultMessage: 'boolean' }),
  date: i18n.translate('xpack.lens.datatypes.date', { defaultMessage: 'date' }),
  ip: i18n.translate('xpack.lens.datatypes.ipAddress', { defaultMessage: 'IP' }),
};

export function IndexPatternDataPanel({
  setState,
  state,
  dragDropContext,
  core,
  query,
  filters,
  dateRange,
  changeIndexPattern,
}: Props) {
  const { indexPatternRefs, indexPatterns, currentIndexPatternId } = state;

  const onChangeIndexPattern = useCallback(
    (id: string) => changeIndexPattern(id, state, setState),
    [state, setState]
  );

  const onToggleEmptyFields = useCallback(() => {
    setState(prevState => ({ ...prevState, showEmptyFields: !prevState.showEmptyFields }));
  }, [setState]);

  const indexPatternList = uniq(
    Object.values(state.layers)
      .map(l => l.indexPatternId)
      .concat(currentIndexPatternId)
  )
    .sort((a, b) => a.localeCompare(b))
    .filter(id => !!indexPatterns[id])
    .map(id => ({
      title: indexPatterns[id].title,
      timeFieldName: indexPatterns[id].timeFieldName,
    }));

  useEffect(() => {
    syncExistingFields({
      dateRange,
      setState,
      indexPatterns: indexPatternList,
      fetchJson: core.http.get,
    });
  }, [
    dateRange.fromDate,
    dateRange.toDate,
    indexPatternList.map(x => `${x.title}:${x.timeFieldName}`).join(','),
  ]);

  return (
    <MemoizedDataPanel
      currentIndexPatternId={currentIndexPatternId}
      indexPatternRefs={indexPatternRefs}
      indexPatterns={indexPatterns}
      query={query}
      dateRange={dateRange}
      filters={filters}
      dragDropContext={dragDropContext}
      showEmptyFields={state.showEmptyFields}
      onToggleEmptyFields={onToggleEmptyFields}
      core={core}
      onChangeIndexPattern={onChangeIndexPattern}
      existingFields={state.existingFields}
    />
  );
}

interface DataPanelState {
  nameFilter: string;
  typeFilter: DataType[];
  isTypeFilterOpen: boolean;
}

export const InnerIndexPatternDataPanel = function InnerIndexPatternDataPanel({
  currentIndexPatternId,
  indexPatternRefs,
  indexPatterns,
  query,
  dateRange,
  filters,
  dragDropContext,
  onChangeIndexPattern,
  showEmptyFields,
  onToggleEmptyFields,
  core,
  existingFields,
}: Pick<DatasourceDataPanelProps, Exclude<keyof DatasourceDataPanelProps, 'state' | 'setState'>> & {
  currentIndexPatternId: string;
  indexPatternRefs: IndexPatternRef[];
  indexPatterns: Record<string, IndexPattern>;
  dragDropContext: DragContextState;
  showEmptyFields: boolean;
  onToggleEmptyFields: () => void;
  onChangeIndexPattern: (newId: string) => void;
  existingFields: IndexPatternPrivateState['existingFields'];
}) {
  if (Object.keys(indexPatterns).length === 0) {
    return (
      <EuiFlexGroup
        gutterSize="m"
        className="lnsInnerIndexPatternDataPanel"
        direction="column"
        responsive={false}
      >
        <EuiFlexItem grow={null}>
          <EuiCallOut
            data-test-subj="indexPattern-no-indexpatterns"
            title={i18n.translate('xpack.lens.indexPattern.noPatternsLabel', {
              defaultMessage: 'No index patterns',
            })}
            color="warning"
            iconType="alert"
          >
            <p>
              <FormattedMessage
                id="xpack.lens.indexPattern.noPatternsDescription"
                defaultMessage="Please create an index pattern or switch to another data source"
              />
            </p>
          </EuiCallOut>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  const [localState, setLocalState] = useState<DataPanelState>({
    nameFilter: '',
    typeFilter: [],
    isTypeFilterOpen: false,
  });
  const [pageSize, setPageSize] = useState(PAGINATION_SIZE);
  const [scrollContainer, setScrollContainer] = useState<Element | undefined>(undefined);
  const currentIndexPattern = indexPatterns[currentIndexPatternId];
  const allFields = currentIndexPattern.fields;
  const fieldByName = indexBy(allFields, 'name');

  const lazyScroll = () => {
    if (scrollContainer) {
      const nearBottom =
        scrollContainer.scrollTop + scrollContainer.clientHeight >
        scrollContainer.scrollHeight * 0.9;
      if (nearBottom) {
        setPageSize(Math.max(PAGINATION_SIZE, Math.min(pageSize * 1.5, allFields.length)));
      }
    }
  };

  useEffect(() => {
    // Reset the scroll if we have made material changes to the field list
    if (scrollContainer) {
      scrollContainer.scrollTop = 0;
      setPageSize(PAGINATION_SIZE);
      lazyScroll();
    }
  }, [localState.nameFilter, localState.typeFilter, currentIndexPatternId, showEmptyFields]);

  const availableFieldTypes = uniq(allFields.map(({ type }) => type)).filter(
    type => type in fieldTypeNames
  );

  const displayedFields = allFields.filter(field => {
    if (!supportedFieldTypes.has(field.type)) {
      return false;
    }

    if (
      localState.nameFilter.length &&
      !field.name.toLowerCase().includes(localState.nameFilter.toLowerCase())
    ) {
      return false;
    }

    if (!showEmptyFields) {
      const indexField = currentIndexPattern && fieldByName[field.name];
      const exists =
        indexField && fieldExists(existingFields, currentIndexPattern.title, indexField.name);
      if (localState.typeFilter.length > 0) {
        return exists && localState.typeFilter.includes(field.type as DataType);
      }

      return exists;
    }

    if (localState.typeFilter.length > 0) {
      return localState.typeFilter.includes(field.type as DataType);
    }

    return true;
  });

  const paginatedFields = displayedFields.sort(sortFields).slice(0, pageSize);

  return (
    <ChildDragDropProvider {...dragDropContext}>
      <EuiFlexGroup
        gutterSize="none"
        className="lnsInnerIndexPatternDataPanel"
        direction="column"
        responsive={false}
      >
        <EuiFlexItem grow={null}>
          <div className="lnsInnerIndexPatternDataPanel__header">
            <ChangeIndexPattern
              data-test-subj="indexPattern-switcher"
              trigger={{
                label: currentIndexPattern.title,
                title: currentIndexPattern.title,
                'data-test-subj': 'indexPattern-switch-link',
                className: 'lnsInnerIndexPatternDataPanel__triggerButton',
              }}
              indexPatternRefs={indexPatternRefs}
              onChangeIndexPattern={(newId: string) => {
                onChangeIndexPattern(newId);

                setLocalState(s => ({
                  ...s,
                  nameFilter: '',
                  typeFilter: [],
                }));
              }}
            />
          </div>
        </EuiFlexItem>
        <EuiFlexItem>
          <div className="lnsInnerIndexPatternDataPanel__filterWrapper">
            <EuiFormControlLayout
              icon="search"
              fullWidth
              clear={{
                title: i18n.translate('xpack.lens.indexPatterns.clearFiltersLabel', {
                  defaultMessage: 'Clear name and type filters',
                }),
                'aria-label': i18n.translate('xpack.lens.indexPatterns.clearFiltersLabel', {
                  defaultMessage: 'Clear name and type filters',
                }),
                onClick: () => {
                  trackUiEvent('indexpattern_filters_cleared');
                  setLocalState(s => ({
                    ...s,
                    nameFilter: '',
                    typeFilter: [],
                  }));
                },
              }}
            >
              <input
                className="euiFieldText euiFieldText--fullWidth lnsInnerIndexPatternDataPanel__textField"
                data-test-subj="lnsIndexPatternFieldSearch"
                placeholder={i18n.translate('xpack.lens.indexPatterns.filterByNameLabel', {
                  defaultMessage: 'Search for fields',
                  description:
                    'Search the list of fields in the index pattern for the provided text',
                })}
                value={localState.nameFilter}
                onChange={e => {
                  setLocalState({ ...localState, nameFilter: e.target.value });
                }}
                aria-label={i18n.translate('xpack.lens.indexPatterns.filterByNameAriaLabel', {
                  defaultMessage: 'Search fields',
                })}
              />
            </EuiFormControlLayout>
          </div>
          <div className="lnsInnerIndexPatternDataPanel__filtersWrapper">
            <EuiPopover
              id="dataPanelTypeFilter"
              panelClassName="euiFilterGroup__popoverPanel"
              panelPaddingSize="none"
              anchorPosition="downLeft"
              display="block"
              isOpen={localState.isTypeFilterOpen}
              closePopover={() => setLocalState(() => ({ ...localState, isTypeFilterOpen: false }))}
              button={
                <EuiFacetButton
                  data-test-subj="lnsIndexPatternFiltersToggle"
                  className="lnsInnerIndexPatternDataPanel__filterButton"
                  quantity={localState.typeFilter.length}
                  icon={<EuiIcon type="filter" />}
                  isSelected={localState.typeFilter.length ? true : false}
                  onClick={() => {
                    setLocalState(s => ({
                      ...s,
                      isTypeFilterOpen: !localState.isTypeFilterOpen,
                    }));
                  }}
                >
                  <FormattedMessage
                    id="xpack.lens.indexPatterns.toggleFiltersPopover"
                    defaultMessage="Fields filtered"
                  />
                </EuiFacetButton>
              }
            >
              <EuiPopoverTitle>
                {i18n.translate('xpack.lens.indexPatterns.filterByTypeLabel', {
                  defaultMessage: 'Filter by type',
                })}
              </EuiPopoverTitle>
              <FixedEuiContextMenuPanel
                watchedItemProps={['icon', 'disabled']}
                data-test-subj="lnsIndexPatternTypeFilterOptions"
                items={(availableFieldTypes as DataType[]).map(type => (
                  <EuiContextMenuItem
                    key={type}
                    icon={localState.typeFilter.includes(type) ? 'check' : 'empty'}
                    data-test-subj={`typeFilter-${type}`}
                    onClick={() => {
                      trackUiEvent('indexpattern_type_filter_toggled');
                      setLocalState(s => ({
                        ...s,
                        typeFilter: localState.typeFilter.includes(type)
                          ? localState.typeFilter.filter(t => t !== type)
                          : [...localState.typeFilter, type],
                      }));
                    }}
                  >
                    <LensFieldIcon type={type} /> {fieldTypeNames[type]}
                  </EuiContextMenuItem>
                ))}
              />
              <EuiPopoverFooter>
                <EuiSwitch
                  compressed
                  checked={!showEmptyFields}
                  onChange={() => {
                    trackUiEvent('indexpattern_existence_toggled');
                    onToggleEmptyFields();
                  }}
                  label={i18n.translate('xpack.lens.indexPatterns.toggleEmptyFieldsSwitch', {
                    defaultMessage: 'Only show fields with data',
                  })}
                  data-test-subj="lnsEmptyFilter"
                />
              </EuiPopoverFooter>
            </EuiPopover>
          </div>
          <div
            className="lnsInnerIndexPatternDataPanel__listWrapper"
            ref={el => {
              if (el && !el.dataset.dynamicScroll) {
                el.dataset.dynamicScroll = 'true';
                setScrollContainer(el);
              }
            }}
            onScroll={lazyScroll}
          >
            <div className="lnsInnerIndexPatternDataPanel__list">
              {paginatedFields.map(field => {
                const overallField = fieldByName[field.name];
                return (
                  <FieldItem
                    core={core}
                    indexPattern={currentIndexPattern}
                    key={field.name}
                    field={field}
                    highlight={localState.nameFilter.toLowerCase()}
                    exists={
                      overallField &&
                      fieldExists(existingFields, currentIndexPattern.title, overallField.name)
                    }
                    dateRange={dateRange}
                    query={query}
                    filters={filters}
                  />
                );
              })}

              {paginatedFields.length === 0 && (
                <EuiText size="s" color="subdued">
                  <p>
                    <strong>
                      {showEmptyFields
                        ? i18n.translate('xpack.lens.indexPatterns.hiddenFieldsLabel', {
                            defaultMessage:
                              'No fields have data with the current filters. You can show fields without data using the filters above.',
                          })
                        : i18n.translate('xpack.lens.indexPatterns.noFieldsLabel', {
                            defaultMessage: 'No fields in {title} can be visualized.',
                            values: { title: currentIndexPattern.title },
                          })}
                    </strong>
                  </p>
                </EuiText>
              )}
            </div>
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>
    </ChildDragDropProvider>
  );
};

export const MemoizedDataPanel = memo(InnerIndexPatternDataPanel);
