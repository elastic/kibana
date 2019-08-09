/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { useState, useEffect, memo, useCallback } from 'react';
import {
  EuiComboBox,
  EuiFieldSearch,
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
  // exists: i18n.translate('xpack.lens.datatypes.exists', { defaultMessage: 'Exists' }),
  string: i18n.translate('xpack.lens.datatypes.string', { defaultMessage: 'string' }),
  number: i18n.translate('xpack.lens.datatypes.number', { defaultMessage: 'number' }),
  boolean: i18n.translate('xpack.lens.datatypes.boolean', { defaultMessage: 'boolean' }),
  date: i18n.translate('xpack.lens.datatypes.date', { defaultMessage: 'date' }),
};

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
        currentIndexPatternId: newIndexPattern,
      });
    },
    [state, setState]
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
    />
  );
}

// export interface DataVisOverallField {
//   fieldName: string;
//   existsInDocs: boolean;
//   stats: {
//     sampleCount: number;
//     count: number;
//     cardinality: number;
//   };
// }

// export interface DataVisOverall {
//   totalCount: number;
//   aggregatableExistsFields: DataVisOverallField[];
//   aggregatableNotExistsFields: DataVisOverallField[];
//   nonAggregatableExistsFields: DataVisOverallField[];
//   nonAggregatableNotExistsFields: DataVisOverallField[];
// }
type OverallFields = Record<
  string,
  {
    count: number;
    cardinality: number;
  }
>;

// type FilterableType = DataType | 'exists';

interface DataPanelState {
  nameFilter: string;
  typeFilter: DataType[];
  existsFilter: boolean;
  isTypeFilterOpen: boolean;
  overallFields?: OverallFields;
}

export const InnerIndexPatternDataPanel = function InnerIndexPatternDataPanel({
  currentIndexPatternId,
  indexPatterns,
  dragDropContext,
  showIndexPatternSwitcher,
  setShowIndexPatternSwitcher,
  onChangeIndexPattern,
}: {
  currentIndexPatternId: string;
  indexPatterns: Record<string, IndexPattern>;
  dragDropContext: DragContextState;
  showIndexPatternSwitcher: boolean;
  setShowIndexPatternSwitcher: (show: boolean) => void;
  onChangeIndexPattern?: (newId: string) => void;
}) {
  const [state, setState] = useState<DataPanelState>({
    nameFilter: '',
    typeFilter: [],
    existsFilter: false,
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
  }, [state.nameFilter, state.typeFilter, currentIndexPatternId, state.overallFields]);

  if (Object.keys(indexPatterns).length === 0) {
    return (
      <EuiFlexGroup gutterSize="s" className="lnsIndexPatternDataPanel" direction="column">
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

  const availableFieldTypes = _.uniq(allFields.map(({ type }) => type)).filter(
    type => type in fieldTypeNames
  );

  // console.log(availableFieldTypes);
  // const availableFilteredTypes = state.typeFilter.filter(type =>
  //   availableFieldTypes.includes(type)
  // );

  const displayedFields = allFields
    .filter(field => {
      if (state.existsFilter) {
        if (state.typeFilter.length > 0) {
          return (
            state.overallFields &&
            state.overallFields[field.name] &&
            state.typeFilter.includes(field.type as DataType)
          );
        }
        return state.overallFields && state.overallFields[field.name];
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
        console.log(results);
        setState(s => ({
          ...s,
          overallFields: results,
        }));
      });
  }, [currentIndexPatternId]);

  return (
    <ChildDragDropProvider {...dragDropContext}>
      <EuiFlexGroup gutterSize="s" className="lnsIndexPatternDataPanel" direction="column">
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
                    existsFilter: false,
                  }));

                  setShowIndexPatternSwitcher(false);
                }}
              />
            )}
          </div>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="m" className="lnsIndexPatternDataPanel__filter-wrapper">
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
                      hasActiveFilters={state.typeFilter.length > 0 || state.existsFilter}
                      numActiveFilters={state.typeFilter.length + (state.existsFilter ? 1 : 0)}
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
                        key="empty"
                        icon={state.existsFilter ? 'check' : 'empty'}
                        data-test-subj="emptyFilter"
                        onClick={() => {
                          setState(s => ({
                            ...s,
                            existsFilter: !state.existsFilter,
                          }));
                        }}
                      >
                        {i18n.translate('xpack.lens.datatypes.exists', {
                          defaultMessage: 'Contains data',
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
              {paginatedFields.map(field => {
                const overallField = state.overallFields && state.overallFields[field.name];
                return (
                  <FieldItem
                    indexPattern={indexPatterns[currentIndexPatternId]}
                    key={field.name}
                    field={field}
                    highlight={state.nameFilter.toLowerCase()}
                    exists={!!overallField}
                    // howManyDocs={state.overallStats && state.overallStats.totalCount}
                    count={overallField && overallField.count}
                    cardinality={overallField && overallField.cardinality}
                    // sampleCount={overallField && overallField.stats.sampleCount}
                    // cardinality={overallField && overallField.stats.cardinality}
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

const MemoizedDataPanel = memo(InnerIndexPatternDataPanel);
