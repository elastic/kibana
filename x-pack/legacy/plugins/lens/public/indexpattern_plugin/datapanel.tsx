/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { useState } from 'react';
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
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DatasourceDataPanelProps, DataType } from '../types';
import { IndexPatternPrivateState, IndexPatternField } from './indexpattern';
import { ChildDragDropProvider } from '../drag_drop';
import { FieldItem } from './field_item';
import { FieldIcon } from './field_icon';

// TODO the typings for EuiContextMenuPanel are incorrect - watchedItemProps is missing. This can be removed when the types are adjusted
const FixedEuiContextMenuPanel = (EuiContextMenuPanel as any) as React.FunctionComponent<
  EuiContextMenuPanelProps & { watchedItemProps: string[] }
>;

function sortFields(fieldA: IndexPatternField, fieldB: IndexPatternField) {
  return fieldA.name.toLowerCase() < fieldB.name.toLowerCase() ? -1 : 1;
}

const supportedFieldTypes = ['string', 'number', 'boolean', 'date'];

const fieldTypeNames: Record<DataType, string> = {
  string: i18n.translate('xpack.lens.datatypes.string', { defaultMessage: 'string' }),
  number: i18n.translate('xpack.lens.datatypes.number', { defaultMessage: 'number' }),
  boolean: i18n.translate('xpack.lens.datatypes.boolean', { defaultMessage: 'boolean' }),
  date: i18n.translate('xpack.lens.datatypes.date', { defaultMessage: 'date' }),
};

export function IndexPatternDataPanel(props: DatasourceDataPanelProps<IndexPatternPrivateState>) {
  const [fieldsFilter, setFieldsFilter] = useState('');
  const [showIndexPatternSwitcher, setShowIndexPatternSwitcher] = useState(false);
  const [isTypeFilterOpen, setTypeFilterOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<DataType[]>([]);

  function filterFields(field: IndexPatternField) {
    return (
      field.name.toLowerCase().includes(fieldsFilter.toLowerCase()) &&
      supportedFieldTypes.includes(field.type)
    );
  }

  const filteredFields = props.state.indexPatterns[props.state.currentIndexPatternId].fields.filter(
    filterFields
  );

  const availableFieldTypes = _.uniq(filteredFields.map(({ type }) => type));
  const availableFilteredTypes = typeFilter.filter(type => availableFieldTypes.includes(type));

  return (
    <ChildDragDropProvider {...props.dragDropContext}>
      <EuiFlexGroup gutterSize="s" className="lnsIndexPatternDataPanel" direction="column">
        <EuiFlexItem grow={null}>
          <div className="lnsIndexPatternDataPanel__header">
            {!showIndexPatternSwitcher ? (
              <>
                <EuiTitle size="xxs">
                  <h4 title={props.state.indexPatterns[props.state.currentIndexPatternId].title}>
                    {props.state.indexPatterns[props.state.currentIndexPatternId].title}{' '}
                  </h4>
                </EuiTitle>
                <EuiButtonEmpty
                  className="lnsIndexPatternDataPanel__changeLink"
                  onClick={() => setShowIndexPatternSwitcher(true)}
                  size="xs"
                >
                  (change)
                </EuiButtonEmpty>
              </>
            ) : (
              <EuiComboBox
                data-test-subj="indexPattern-switcher"
                options={Object.values(props.state.indexPatterns).map(({ title, id }) => ({
                  label: title,
                  value: id,
                }))}
                inputRef={el => {
                  if (el) {
                    el.focus();
                  }
                }}
                selectedOptions={
                  props.state.currentIndexPatternId
                    ? [
                        {
                          label: props.state.indexPatterns[props.state.currentIndexPatternId].title,
                          value: props.state.indexPatterns[props.state.currentIndexPatternId].id,
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
                  setShowIndexPatternSwitcher(false);
                  props.setState({
                    ...props.state,
                    currentIndexPatternId: choices[0].value as string,
                  });
                }}
              />
            )}
          </div>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="m">
            <EuiFlexItem grow={true}>
              <EuiFieldSearch
                placeholder={i18n.translate('xpack.viz_editor.indexPatterns.filterByNameLabel', {
                  defaultMessage: 'Search fields',
                  description:
                    'Search the list of fields in the index pattern for the provided text',
                })}
                value={fieldsFilter}
                onChange={e => {
                  setFieldsFilter(e.target.value);
                }}
                aria-label="Search fields"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFilterGroup>
                <EuiPopover
                  id="dataPanelTypeFilter"
                  panelClassName="euiFilterGroup__popoverPanel"
                  panelPaddingSize="none"
                  isOpen={isTypeFilterOpen}
                  closePopover={() => setTypeFilterOpen(false)}
                  button={
                    <EuiFilterButton
                      onClick={() => setTypeFilterOpen(!isTypeFilterOpen)}
                      iconType="arrowDown"
                      data-test-subj="savedObjectFinderFilterButton"
                      isSelected={isTypeFilterOpen}
                      numFilters={availableFieldTypes.length}
                      hasActiveFilters={availableFilteredTypes.length > 0}
                      numActiveFilters={availableFilteredTypes.length}
                    >
                      {i18n.translate('xpack.lens.indexpattern.typefilter', {
                        defaultMessage: 'Types',
                      })}
                    </EuiFilterButton>
                  }
                >
                  <FixedEuiContextMenuPanel
                    watchedItemProps={['icon', 'disabled']}
                    items={(availableFieldTypes as DataType[]).map(type => (
                      <EuiContextMenuItem
                        key={type}
                        icon={typeFilter.includes(type) ? 'check' : 'empty'}
                        data-test-subj={`typeFilter-${type}`}
                        onClick={() => {
                          setTypeFilter(
                            typeFilter.includes(type)
                              ? typeFilter.filter(t => t !== type)
                              : [...typeFilter, type]
                          );
                        }}
                      >
                        <FieldIcon type={type} /> {fieldTypeNames[type]}
                      </EuiContextMenuItem>
                    ))}
                  />
                </EuiPopover>
              </EuiFilterGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
          <div className="lnsFieldListPanel__list">
            {props.state.currentIndexPatternId &&
              props.state.indexPatterns[props.state.currentIndexPatternId].fields
                .filter(filterFields)
                .filter(
                  field => typeFilter.length === 0 || typeFilter.includes(field.type as DataType)
                )
                .sort(sortFields)
                .map(field => (
                  <FieldItem
                    key={field.name}
                    field={field}
                    draggable
                    highlight={fieldsFilter.toLowerCase()}
                  />
                ))}
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>
    </ChildDragDropProvider>
  );
}
