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
    (allFields: IndexPattern['fields']) => {
      setState(prevState => {
        return {
          ...prevState,
          indexPatterns: {
            ...prevState.indexPatterns,
            [currentIndexPatternId]: {
              ...prevState.indexPatterns[currentIndexPatternId],
              hasExistence: true,
              fields: allFields,
            },
          },
        };
      });
    },
    [currentIndexPatternId, indexPatterns[currentIndexPatternId]]
  );

  return (
    <MemoizedDataPanel
      showIndexPatternSwitcher={showIndexPatternSwitcher}
      setShowIndexPatternSwitcher={setShowIndexPatternSwitcher}
      currentIndexPatternId={currentIndexPatternId}
      indexPatterns={indexPatterns}
      dragDropContext={dragDropContext}
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
  hiddenFilter: boolean;
  isTypeFilterOpen: boolean;
}

export const InnerIndexPatternDataPanel = function InnerIndexPatternDataPanel({
  currentIndexPatternId,
  indexPatterns,
  dragDropContext,
  showIndexPatternSwitcher,
  setShowIndexPatternSwitcher,
  onChangeIndexPattern,
  updateFieldsWithCounts,
}: {
  currentIndexPatternId: string;
  indexPatterns: Record<string, IndexPattern>;
  dragDropContext: DragContextState;
  showIndexPatternSwitcher: boolean;
  setShowIndexPatternSwitcher: (show: boolean) => void;
  onChangeIndexPattern?: (newId: string) => void;
  updateFieldsWithCounts?: (fields: IndexPattern['fields']) => void;
}) {
  const [state, setState] = useState<DataPanelState>({
    isLoading: false,
    nameFilter: '',
    typeFilter: [],
    hiddenFilter: false,
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
  }, [state.nameFilter, state.typeFilter, currentIndexPatternId]);

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
      if (!state.hiddenFilter) {
        const indexField =
          indexPatterns[currentIndexPatternId] &&
          indexPatterns[currentIndexPatternId].hasExistence &&
          indexPatterns[currentIndexPatternId].fields.find(f => f.name === field.name);
        if (state.typeFilter.length > 0) {
          return (
            indexField && indexField.exists && state.typeFilter.includes(field.type as DataType)
          );
        }
        return indexField && indexField.exists;
      }
      if (state.typeFilter.length > 0) {
        return state.typeFilter.includes(field.type as DataType);
      }
      return true;
    })
    .filter(
      (field: IndexPatternField) =>
        field.name.toLowerCase().includes(state.nameFilter.toLowerCase()) &&
        supportedFieldTypes.includes(field.type)
    );

  const paginatedFields = displayedFields.sort(sortFields).slice(0, pageSize);

  useEffect(() => {
    setState(s => ({ ...s, isLoading: true }));

    if (
      state.isLoading ||
      indexPatterns[currentIndexPatternId].hasExistence ||
      !updateFieldsWithCounts
    ) {
      return;
    }

    npStart.core.http
      .post(`/api/lens/index_stats/${indexPatterns[currentIndexPatternId].title}`, {
        body: JSON.stringify({
          query: { match_all: {} },
          earliest: 'now-14d',
          latest: 'now',
          interval: '1d',
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
        setState(s => ({
          ...s,
          isLoading: false,
        }));

        if (!updateFieldsWithCounts) {
          return;
        }

        updateFieldsWithCounts(
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
        setState(s => ({ ...s, isLoading: false }));
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

                  setState(s => ({
                    ...s,
                    nameFilter: '',
                    typeFilter: [],
                    hiddenFilter: false,
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
                value={state.nameFilter}
                onChange={e => {
                  setState({ ...state, nameFilter: e.target.value });
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
                  isOpen={state.isTypeFilterOpen}
                  closePopover={() => setState(s => ({ ...state, isTypeFilterOpen: false }))}
                  button={
                    <EuiFilterButton
                      onClick={() =>
                        setState(s => ({ ...s, isTypeFilterOpen: !state.isTypeFilterOpen }))
                      }
                      iconType="arrowDown"
                      data-test-subj="indexPatternTypeFilterButton"
                      isSelected={state.isTypeFilterOpen}
                      numFilters={availableFieldTypes.length + 1}
                      hasActiveFilters={state.typeFilter.length > 0 || state.hiddenFilter}
                      numActiveFilters={state.typeFilter.length + (state.hiddenFilter ? 1 : 0)}
                    >
                      {i18n.translate('xpack.lens.indexPatterns.typeFilterLabel', {
                        defaultMessage: 'Types',
                      })}
                    </EuiFilterButton>
                  }
                >
                  <FixedEuiContextMenuPanel
                    watchedItemProps={['icon', 'disabled']}
                    items={[
                      <EuiContextMenuItem
                        key="hidden"
                        icon={state.hiddenFilter ? 'check' : 'empty'}
                        data-test-subj="hiddenFilter"
                        onClick={() => {
                          setState(s => ({
                            ...s,
                            hiddenFilter: !state.hiddenFilter,
                          }));
                        }}
                      >
                        {i18n.translate('xpack.lens.datatypes.hiddenFields', {
                          defaultMessage: 'Show fields without data',
                        })}
                      </EuiContextMenuItem>,
                    ].concat(
                      (availableFieldTypes as DataType[]).map(type => (
                        <EuiContextMenuItem
                          key={type}
                          icon={state.typeFilter.includes(type) ? 'check' : 'empty'}
                          data-test-subj={`typeFilter-${type}`}
                          onClick={() =>
                            setState(s => ({
                              ...s,
                              typeFilter: state.typeFilter.includes(type)
                                ? state.typeFilter.filter(t => t !== type)
                                : [...state.typeFilter, type],
                            }))
                          }
                        >
                          <FieldIcon type={type} /> {fieldTypeNames[type]}
                        </EuiContextMenuItem>
                      ))
                    )}
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
              {state.isLoading && <EuiLoadingSpinner />}

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
                    highlight={state.nameFilter.toLowerCase()}
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
