/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mapValues, uniq } from 'lodash';
import React, { useState, useEffect, memo, useCallback } from 'react';
import {
  EuiComboBox,
  EuiFieldSearch,
  EuiLoadingSpinner,
  // @ts-ignore
  EuiHighlight,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiButtonEmpty,
  EuiFilterGroup,
  EuiFilterButton,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiContextMenuPanelProps,
  EuiPopover,
  EuiCallOut,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { npStart } from 'ui/new_platform';

import { Query } from 'src/plugins/data/common';
import { DatasourceDataPanelProps, DataType } from '../types';
import { IndexPatternPrivateState, IndexPatternField, IndexPattern } from './indexpattern';
import { ChildDragDropProvider, DragContextState } from '../drag_drop';
import { FieldItem } from './field_item';
import { FieldIcon } from './field_icon';
import { updateLayerIndexPattern } from './state_helpers';

// TODO the typings for EuiContextMenuPanel are incorrect - watchedItemProps is missing. This can be removed when the types are adjusted
const FixedEuiContextMenuPanel = (EuiContextMenuPanel as unknown) as React.FunctionComponent<
  EuiContextMenuPanelProps & { watchedItemProps: string[] }
>;

function sortFields(fieldA: IndexPatternField, fieldB: IndexPatternField) {
  return fieldA.name.localeCompare(fieldB.name, undefined, { sensitivity: 'base' });
}

const supportedFieldTypes = ['string', 'number', 'boolean', 'date'];
const PAGINATION_SIZE = 50;

const fieldTypeNames: Record<DataType, string> = {
  string: i18n.translate('xpack.lens.datatypes.string', { defaultMessage: 'string' }),
  number: i18n.translate('xpack.lens.datatypes.number', { defaultMessage: 'number' }),
  boolean: i18n.translate('xpack.lens.datatypes.boolean', { defaultMessage: 'boolean' }),
  date: i18n.translate('xpack.lens.datatypes.date', { defaultMessage: 'date' }),
};

function isSingleEmptyLayer(layerMap: IndexPatternPrivateState['layers']) {
  const layers = Object.values(layerMap);
  return layers.length === 1 && layers[0].columnOrder.length === 0;
}

export function IndexPatternDataPanel({
  setState,
  state,
  dragDropContext,
  query,
  dateRange,
}: DatasourceDataPanelProps<IndexPatternPrivateState>) {
  const { indexPatterns, currentIndexPatternId } = state;
  const [showIndexPatternSwitcher, setShowIndexPatternSwitcher] = useState(false);

  const onChangeIndexPattern = useCallback(
    (newIndexPattern: string) => {
      setState({
        ...state,
        layers: isSingleEmptyLayer(state.layers)
          ? mapValues(state.layers, layer =>
              updateLayerIndexPattern(layer, indexPatterns[newIndexPattern])
            )
          : state.layers,
        currentIndexPatternId: newIndexPattern,
      });
    },
    [state, setState]
  );

  const updateFieldsWithCounts = useCallback(
    (indexPatternId: string, allFields: IndexPattern['fields']) => {
      setState(prevState => {
        return {
          ...prevState,
          indexPatterns: {
            ...prevState.indexPatterns,
            [indexPatternId]: {
              ...prevState.indexPatterns[indexPatternId],
              hasExistence: true,
              fields: allFields,
            },
          },
        };
      });
    },
    [currentIndexPatternId, indexPatterns[currentIndexPatternId]]
  );

  const onToggleEmptyFields = useCallback(() => {
    setState(prevState => ({ ...prevState, showEmptyFields: !prevState.showEmptyFields }));
  }, [state, setState]);

  return (
    <MemoizedDataPanel
      showIndexPatternSwitcher={showIndexPatternSwitcher}
      setShowIndexPatternSwitcher={setShowIndexPatternSwitcher}
      currentIndexPatternId={currentIndexPatternId}
      indexPatterns={indexPatterns}
      query={query}
      dateRange={dateRange}
      dragDropContext={dragDropContext}
      showEmptyFields={state.showEmptyFields}
      onToggleEmptyFields={onToggleEmptyFields}
      // only pass in the state change callback if it's actually needed to avoid re-renders
      onChangeIndexPattern={showIndexPatternSwitcher ? onChangeIndexPattern : undefined}
      updateFieldsWithCounts={
        !indexPatterns[currentIndexPatternId].hasExistence ? updateFieldsWithCounts : undefined
      }
    />
  );
}

type OverallFields = Record<
  string,
  {
    count: number;
    cardinality: number;
  }
>;

interface DataPanelState {
  isLoading: boolean;
  nameFilter: string;
  typeFilter: DataType[];
  isTypeFilterOpen: boolean;
}

export const InnerIndexPatternDataPanel = function InnerIndexPatternDataPanel({
  currentIndexPatternId,
  indexPatterns,
  query,
  dateRange,
  dragDropContext,
  showIndexPatternSwitcher,
  setShowIndexPatternSwitcher,
  onChangeIndexPattern,
  updateFieldsWithCounts,
  showEmptyFields,
  onToggleEmptyFields,
}: Partial<DatasourceDataPanelProps> & {
  currentIndexPatternId: string;
  indexPatterns: Record<string, IndexPattern>;
  dateRange: DatasourceDataPanelProps['dateRange'];
  query: Query;
  dragDropContext: DragContextState;
  showIndexPatternSwitcher: boolean;
  setShowIndexPatternSwitcher: (show: boolean) => void;
  showEmptyFields: boolean;
  onToggleEmptyFields: () => void;
  onChangeIndexPattern?: (newId: string) => void;
  updateFieldsWithCounts?: (indexPatternId: string, fields: IndexPattern['fields']) => void;
}) {
  const [localState, setLocalState] = useState<DataPanelState>({
    isLoading: false,
    nameFilter: '',
    typeFilter: [],
    isTypeFilterOpen: false,
  });
  const [pageSize, setPageSize] = useState(PAGINATION_SIZE);
  const [scrollContainer, setScrollContainer] = useState<Element | undefined>(undefined);
  const lazyScroll = () => {
    if (scrollContainer) {
      const nearBottom =
        scrollContainer.scrollTop + scrollContainer.clientHeight >
        scrollContainer.scrollHeight * 0.9;
      if (nearBottom) {
        setPageSize(Math.min(pageSize * 1.5, allFields.length));
      }
    }
  };

  useEffect(() => {
    if (scrollContainer) {
      scrollContainer.scrollTop = 0;
      setPageSize(PAGINATION_SIZE);
      lazyScroll();
    }
  }, [localState.nameFilter, localState.typeFilter, currentIndexPatternId, showEmptyFields]);

  if (Object.keys(indexPatterns).length === 0) {
    return (
      <EuiFlexGroup
        gutterSize="s"
        className="lnsIndexPatternDataPanel"
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

  const allFields = indexPatterns[currentIndexPatternId].fields;

  const availableFieldTypes = uniq(allFields.map(({ type }) => type)).filter(
    type => type in fieldTypeNames
  );

  const displayedFields = allFields
    .filter(field => {
      if (!showEmptyFields) {
        const indexField =
          indexPatterns[currentIndexPatternId] &&
          indexPatterns[currentIndexPatternId].hasExistence &&
          indexPatterns[currentIndexPatternId].fields.find(f => f.name === field.name);
        if (localState.typeFilter.length > 0) {
          return (
            indexField &&
            indexField.exists &&
            localState.typeFilter.includes(field.type as DataType)
          );
        }
        return indexField && indexField.exists;
      }
      if (localState.typeFilter.length > 0) {
        return localState.typeFilter.includes(field.type as DataType);
      }
      return true;
    })
    .filter(
      (field: IndexPatternField) =>
        field.name.toLowerCase().includes(localState.nameFilter.toLowerCase()) &&
        supportedFieldTypes.includes(field.type)
    );

  const paginatedFields = displayedFields.sort(sortFields).slice(0, pageSize);

  useEffect(() => {
    if (
      localState.isLoading ||
      indexPatterns[currentIndexPatternId].hasExistence ||
      !updateFieldsWithCounts
    ) {
      return;
    }

    setLocalState(s => ({ ...s, isLoading: true }));

    npStart.core.http
      .post(`/api/lens/index_stats/${indexPatterns[currentIndexPatternId].title}`, {
        body: JSON.stringify({
          query: { match_all: {} },
          earliest: dateRange.fromDate,
          latest: dateRange.toDate,
          size: 500,
          timeFieldName: indexPatterns[currentIndexPatternId].timeFieldName,
          maxExamples: 5,
          fields: allFields
            .filter(field => field.aggregatable)
            .map(field => ({
              name: field.name,
              type: field.type,
            })),
        }),
      })
      .then((results: OverallFields) => {
        setLocalState(s => ({
          ...s,
          isLoading: false,
        }));

        if (!updateFieldsWithCounts) {
          return;
        }

        updateFieldsWithCounts(
          currentIndexPatternId,
          indexPatterns[currentIndexPatternId].fields.map(field => {
            const matching = results[field.name];
            if (!matching) {
              return { ...field, exists: false };
            }
            return {
              ...field,
              exists: true,
              cardinality: matching.cardinality,
              count: matching.count,
            };
          })
        );
      })
      .catch(() => {
        setLocalState(s => ({ ...s, isLoading: false }));
      });
  }, [currentIndexPatternId]);

  return (
    <ChildDragDropProvider {...dragDropContext}>
      <EuiFlexGroup
        gutterSize="none"
        className="lnsIndexPatternDataPanel"
        direction="column"
        responsive={false}
      >
        <EuiFlexItem grow={null}>
          <div className="lnsIndexPatternDataPanel__header">
            {!showIndexPatternSwitcher ? (
              <>
                <EuiTitle size="xxs">
                  <h4
                    className="lnsIndexPatternDataPanel__header"
                    title={indexPatterns[currentIndexPatternId].title}
                  >
                    {indexPatterns[currentIndexPatternId].title}{' '}
                  </h4>
                </EuiTitle>
                <EuiButtonEmpty
                  data-test-subj="indexPattern-switch-link"
                  className="lnsIndexPatternDataPanel__changeLink"
                  onClick={() => setShowIndexPatternSwitcher(true)}
                  size="xs"
                >
                  (
                  <FormattedMessage
                    id="xpack.lens.indexPatterns.changePatternLabel"
                    defaultMessage="change"
                  />
                  )
                </EuiButtonEmpty>
              </>
            ) : (
              <EuiComboBox
                data-test-subj="indexPattern-switcher"
                options={Object.values(indexPatterns).map(({ title, id }) => ({
                  label: title,
                  value: id,
                }))}
                inputRef={el => {
                  if (el) {
                    el.focus();
                  }
                }}
                selectedOptions={
                  currentIndexPatternId
                    ? [
                        {
                          label: indexPatterns[currentIndexPatternId].title,
                          value: indexPatterns[currentIndexPatternId].id,
                        },
                      ]
                    : undefined
                }
                singleSelection={{ asPlainText: true }}
                isClearable={false}
                onBlur={() => {
                  setShowIndexPatternSwitcher(false);
                }}
                onChange={choices => {
                  onChangeIndexPattern!(choices[0].value as string);

                  setLocalState(s => ({
                    ...s,
                    nameFilter: '',
                    typeFilter: [],
                  }));

                  setShowIndexPatternSwitcher(false);
                }}
              />
            )}
          </div>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup
            gutterSize="s"
            className="lnsIndexPatternDataPanel__filter-wrapper"
            responsive={false}
          >
            <EuiFlexItem grow={true}>
              <EuiFieldSearch
                placeholder={i18n.translate('xpack.lens.indexPatterns.filterByNameLabel', {
                  defaultMessage: 'Search fields',
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
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFilterGroup>
                <EuiPopover
                  id="dataPanelTypeFilter"
                  panelClassName="euiFilterGroup__popoverPanel"
                  panelPaddingSize="none"
                  isOpen={localState.isTypeFilterOpen}
                  closePopover={() =>
                    setLocalState(s => ({ ...localState, isTypeFilterOpen: false }))
                  }
                  button={
                    <EuiFilterButton
                      onClick={() =>
                        setLocalState(s => ({
                          ...s,
                          isTypeFilterOpen: !localState.isTypeFilterOpen,
                        }))
                      }
                      iconType="arrowDown"
                      data-test-subj="indexPatternTypeFilterButton"
                      isSelected={localState.isTypeFilterOpen}
                      numFilters={availableFieldTypes.length + 1}
                      hasActiveFilters={localState.typeFilter.length > 0 || showEmptyFields}
                      numActiveFilters={localState.typeFilter.length + (showEmptyFields ? 1 : 0)}
                    >
                      {i18n.translate('xpack.lens.indexPatterns.typeFilterLabel', {
                        defaultMessage: 'Types',
                      })}
                    </EuiFilterButton>
                  }
                >
                  <FixedEuiContextMenuPanel
                    watchedItemProps={['icon', 'disabled']}
                    items={(availableFieldTypes as DataType[])
                      .map(type => (
                        <EuiContextMenuItem
                          key={type}
                          icon={localState.typeFilter.includes(type) ? 'check' : 'empty'}
                          data-test-subj={`typeFilter-${type}`}
                          onClick={() =>
                            setLocalState(s => ({
                              ...s,
                              typeFilter: localState.typeFilter.includes(type)
                                ? localState.typeFilter.filter(t => t !== type)
                                : [...localState.typeFilter, type],
                            }))
                          }
                        >
                          <FieldIcon type={type} /> {fieldTypeNames[type]}
                        </EuiContextMenuItem>
                      ))
                      .concat([
                        <EuiContextMenuItem
                          key="empty"
                          icon={showEmptyFields ? 'empty' : 'check'}
                          data-test-subj="emptyFilter"
                          onClick={() => {
                            onToggleEmptyFields();
                          }}
                        >
                          {i18n.translate('xpack.lens.datatypes.hiddenFields', {
                            defaultMessage: 'Only show fields that contain data',
                          })}
                        </EuiContextMenuItem>,
                      ])}
                  />
                </EuiPopover>
              </EuiFilterGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
          <div
            className="lnsFieldListPanel__list-wrapper"
            ref={el => {
              if (el && !el.dataset.dynamicScroll) {
                el.dataset.dynamicScroll = 'true';
                setScrollContainer(el);
              }
            }}
            onScroll={lazyScroll}
          >
            <div className="lnsFieldListPanel__list">
              {localState.isLoading && <EuiLoadingSpinner />}

              {paginatedFields.map(field => {
                // const overallField = state.overallFields && state.overallFields[field.name];
                const overallField = indexPatterns[currentIndexPatternId].fields.find(
                  f => f.name === field.name
                );
                return (
                  <FieldItem
                    indexPattern={indexPatterns[currentIndexPatternId]}
                    key={field.name}
                    field={field}
                    highlight={localState.nameFilter.toLowerCase()}
                    exists={overallField ? !!overallField.exists : false}
                    // howManyDocs={state.overallStats && state.overallStats.totalCount}
                    count={overallField && overallField.count}
                    cardinality={overallField && overallField.cardinality}
                    sampleCount={overallField ? 500 : undefined}
                    // sampleCount={overallField && overallField.stats.sampleCount}
                  />
                );
              })}
            </div>
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>
    </ChildDragDropProvider>
  );
};

export const MemoizedDataPanel = memo(InnerIndexPatternDataPanel);
