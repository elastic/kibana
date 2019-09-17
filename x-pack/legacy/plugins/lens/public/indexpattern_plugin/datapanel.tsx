/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uniq, indexBy } from 'lodash';
import React, { useState, useEffect, memo, useMemo } from 'react';
import {
  EuiComboBox,
  EuiLoadingSpinner,
  // @ts-ignore
  EuiHighlight,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiButtonEmpty,
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
  EuiIcon,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { DatasourceProps, IndexPatternListItem, DatasourceDataPanelProps } from '../types';
import { IndexPatternPrivateState } from './indexpattern';
import { ChildDragDropProvider, DragContextState } from '../drag_drop';
import { FieldItem } from './field_item';
import { FieldIcon } from './field_icon';
import { DataType, IndexPatternField, IndexPattern } from '../../common';
import { Actions, getCurrentIndexPattern } from './state_helpers';

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

export interface Props extends DatasourceDataPanelProps<IndexPatternPrivateState> {
  actions: Actions;
}

export function IndexPatternDataPanel({
  state,
  dragDropContext,
  core,
  query,
  dateRange,
  actions,
}: Props) {
  // HACK: This bit of code is the trigger that loads emptiness data for index pattern fields
  // any time the date range filter changes or the actively used index pattern changes. This
  // really belongs in a proper state management layer.
  const indexPatternIds = _.uniq(
    Object.values(state.layers)
      .map(l => l.indexPatternId)
      .concat(state.currentIndexPatternId)
  );
  useEffect(() => {
    actions.syncEmptyFields(indexPatternIds);
  }, [dateRange, indexPatternIds.join(',')]);

  return (
    <MemoizedDataPanel
      currentIndexPatternId={state.currentIndexPatternId}
      indexPatterns={state.indexPatterns}
      currentIndexPattern={getCurrentIndexPattern(state)}
      query={query}
      dragDropContext={dragDropContext}
      showEmptyFields={state.showEmptyFields}
      onToggleEmptyFields={actions.toggleEmptyFields}
      onChangeIndexPattern={actions.setCurrentIndexPattern}
    />
  );
}

interface DataPanelState {
  isLoading: boolean;
  nameFilter: string;
  typeFilter: DataType[];
  isTypeFilterOpen: boolean;
}

export const InnerIndexPatternDataPanel = function InnerIndexPatternDataPanel({
  currentIndexPatternId,
  indexPatterns,
  currentIndexPattern,
  dragDropContext,
  onChangeIndexPattern,
  showEmptyFields,
  onToggleEmptyFields,
}: Partial<DatasourceProps> & {
  currentIndexPatternId: string;
  currentIndexPattern?: IndexPattern;
  indexPatterns: Record<string, IndexPatternListItem>;
  dragDropContext: DragContextState;
  showEmptyFields: boolean;
  onToggleEmptyFields: () => void;
  onChangeIndexPattern: (newId: string) => void;
  updateFieldsWithCounts?: (indexPatternId: string, fields: IndexPatternField[]) => void;
}) {
  const [localState, setLocalState] = useState<DataPanelState>({
    isLoading: false,
    nameFilter: '',
    typeFilter: [],
    isTypeFilterOpen: false,
  });

  if (Object.keys(indexPatterns).length === 0) {
    return <EmptyState />;
  }

  if (!currentIndexPattern) {
    return <EuiLoadingSpinner size="m" />;
  }

  return (
    <ChildDragDropProvider {...dragDropContext}>
      <EuiFlexGroup
        gutterSize="none"
        className="lnsIndexPatternDataPanel"
        direction="column"
        responsive={false}
      >
        <DataPanelHeader
          currentIndexPatternId={currentIndexPatternId}
          indexPatterns={indexPatterns}
          onChangeIndexPattern={id => {
            onChangeIndexPattern(id);
            setLocalState(s => ({
              ...s,
              nameFilter: '',
              typeFilter: [],
            }));
          }}
        />
        {currentIndexPattern ? (
          <DataPanelFieldList
            localState={localState}
            setLocalState={setLocalState}
            showEmptyFields={showEmptyFields}
            currentIndexPattern={currentIndexPattern}
            onToggleEmptyFields={onToggleEmptyFields}
          />
        ) : (
          <EuiLoadingSpinner size="m" />
        )}
      </EuiFlexGroup>
    </ChildDragDropProvider>
  );
};

function EmptyState() {
  return (
    <EuiFlexGroup
      gutterSize="m"
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

function DataPanelHeader({
  currentIndexPatternId,
  indexPatterns,
  onChangeIndexPattern,
}: {
  currentIndexPatternId: string;
  indexPatterns: Record<string, IndexPatternListItem>;
  onChangeIndexPattern: (id: string) => void;
}) {
  const [showIndexPatternSwitcher, setShowIndexPatternSwitcher] = useState(false);
  const currentIndexPattern = indexPatterns[currentIndexPatternId];

  return (
    <EuiFlexItem grow={null}>
      <div className="lnsIndexPatternDataPanel__header">
        {!showIndexPatternSwitcher ? (
          <>
            <EuiTitle size="xxs">
              <h4 className="lnsIndexPatternDataPanel__header" title={currentIndexPattern.title}>
                {currentIndexPattern.title}{' '}
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
                      label: currentIndexPattern.title,
                      value: currentIndexPattern.id,
                    },
                  ]
                : undefined
            }
            singleSelection={{ asPlainText: true }}
            isClearable={false}
            onBlur={() => {
              setShowIndexPatternSwitcher(false);
            }}
            onChange={([choice]) => {
              onChangeIndexPattern(choice.value!);
              setShowIndexPatternSwitcher(false);
            }}
          />
        )}
      </div>
    </EuiFlexItem>
  );
}

function DataPanelFieldList({
  currentIndexPattern,
  localState,
  setLocalState,
  showEmptyFields,
  onToggleEmptyFields,
}: {
  currentIndexPattern: IndexPattern;
  localState: DataPanelState;
  setLocalState: React.Dispatch<React.SetStateAction<DataPanelState>>;
  showEmptyFields: boolean;
  onToggleEmptyFields: () => void;
}) {
  const [{ pageSize, scrollContainer }, setScrollState] = useState({
    pageSize: PAGINATION_SIZE,
    scrollContainer: undefined as (Element | undefined),
  });

  const allFields = currentIndexPattern.fields;
  const fieldByName = indexBy(allFields, 'name');
  const displayedFields = allFields.filter(field => {
    if (!supportedFieldTypes.includes(field.type)) {
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
      if (localState.typeFilter.length > 0) {
        return (
          indexField && indexField.exists && localState.typeFilter.includes(field.type as DataType)
        );
      }
      return indexField && indexField.exists;
    }

    if (localState.typeFilter.length > 0) {
      return localState.typeFilter.includes(field.type as DataType);
    }

    return true;
  });

  const paginatedFields = displayedFields.sort(sortFields).slice(0, pageSize);
  const availableFieldTypes = uniq(allFields.map(({ type }) => type)).filter(
    type => type in fieldTypeNames
  );

  const lazyScroll = () => {
    if (scrollContainer) {
      const nearBottom =
        scrollContainer.scrollTop + scrollContainer.clientHeight >
        scrollContainer.scrollHeight * 0.9;
      if (nearBottom) {
        setScrollState(s => ({ ...s, pageSize: Math.min(pageSize * 1.5, allFields.length) }));
      }
    }
  };

  useEffect(() => {
    if (scrollContainer) {
      scrollContainer.scrollTop = 0;
      setScrollState(s => ({ ...s, pageSize: PAGINATION_SIZE }));
      lazyScroll();
    }
  }, [localState.nameFilter, localState.typeFilter, currentIndexPattern.id, showEmptyFields]);

  return (
    <EuiFlexItem>
      <EuiFlexGroup
        gutterSize="s"
        className="lnsIndexPatternDataPanel__filter-wrapper"
        responsive={false}
      >
        <EuiFlexItem grow={true}>
          <EuiFormControlLayout
            prepend={
              <EuiPopover
                id="dataPanelTypeFilter"
                panelClassName="euiFilterGroup__popoverPanel"
                panelPaddingSize="none"
                anchorPosition="downLeft"
                isOpen={localState.isTypeFilterOpen}
                closePopover={() =>
                  setLocalState(() => ({ ...localState, isTypeFilterOpen: false }))
                }
                button={
                  <EuiButtonEmpty
                    size="s"
                    onClick={() => {
                      setLocalState(s => ({
                        ...s,
                        isTypeFilterOpen: !localState.isTypeFilterOpen,
                      }));
                    }}
                    data-test-subj="lnsIndexPatternFiltersToggle"
                    title={i18n.translate('xpack.lens.indexPatterns.toggleFiltersPopover', {
                      defaultMessage: 'Toggle filters for index pattern',
                    })}
                    aria-label={i18n.translate('xpack.lens.indexPatterns.toggleFiltersPopover', {
                      defaultMessage: 'Toggle filters for index pattern',
                    })}
                  >
                    <EuiIcon type="filter" size="m" />
                  </EuiButtonEmpty>
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
                  ))}
                />
                <EuiPopoverFooter>
                  <EuiSwitch
                    checked={!showEmptyFields}
                    onChange={() => onToggleEmptyFields()}
                    label={i18n.translate('xpack.lens.indexPatterns.toggleEmptyFieldsSwitch', {
                      defaultMessage: 'Only show fields with data',
                    })}
                    data-test-subj="lnsEmptyFilter"
                  />
                </EuiPopoverFooter>
              </EuiPopover>
            }
            clear={{
              title: i18n.translate('xpack.lens.indexPatterns.clearFiltersLabel', {
                defaultMessage: 'Clear name and type filters',
              }),
              'aria-label': i18n.translate('xpack.lens.indexPatterns.clearFiltersLabel', {
                defaultMessage: 'Clear name and type filters',
              }),
              onClick: () => {
                setLocalState(s => ({
                  ...s,
                  nameFilter: '',
                  typeFilter: [],
                }));
              },
            }}
          >
            <input
              className="euiFieldText euiFieldText--inGroup"
              data-test-subj="lnsIndexPatternFieldSearch"
              placeholder={i18n.translate('xpack.lens.indexPatterns.filterByNameLabel', {
                defaultMessage: 'Search fields',
                description: 'Search the list of fields in the index pattern for the provided text',
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
        </EuiFlexItem>
      </EuiFlexGroup>
      <div
        className="lnsFieldListPanel__list-wrapper"
        ref={el => {
          if (el && !el.dataset.dynamicScroll) {
            el.dataset.dynamicScroll = 'true';
            setScrollState(s => ({ ...s, scrollContainer: el }));
          }
        }}
        onScroll={lazyScroll}
      >
        <div className="lnsFieldListPanel__list">
          {localState.isLoading && <EuiLoadingSpinner />}

          {paginatedFields.map(field => {
            const overallField = fieldByName[field.name];
            return (
              <FieldItem
                indexPattern={currentIndexPattern}
                key={field.name}
                field={field}
                highlight={localState.nameFilter.toLowerCase()}
                exists={overallField ? !!overallField.exists : false}
              />
            );
          })}

          {!localState.isLoading && paginatedFields.length === 0 && (
            <EuiText>
              {showEmptyFields
                ? i18n.translate('xpack.lens.indexPatterns.hiddenFieldsLabel', {
                    defaultMessage:
                      'No fields have data with the current filters. You can show fields without data using the filters above.',
                  })
                : i18n.translate('xpack.lens.indexPatterns.noFieldsLabel', {
                    defaultMessage: 'No fields are available for the specified time range.',
                  })}
            </EuiText>
          )}
        </div>
      </div>
    </EuiFlexItem>
  );
}

export const MemoizedDataPanel = memo(InnerIndexPatternDataPanel);
