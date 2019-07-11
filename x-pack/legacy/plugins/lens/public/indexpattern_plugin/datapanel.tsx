/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { useState, useEffect } from 'react';
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
const PAGINATION_SIZE = 50;

const fieldTypeNames: Record<DataType, string> = {
  string: i18n.translate('xpack.lens.datatypes.string', { defaultMessage: 'string' }),
  number: i18n.translate('xpack.lens.datatypes.number', { defaultMessage: 'number' }),
  boolean: i18n.translate('xpack.lens.datatypes.boolean', { defaultMessage: 'boolean' }),
  date: i18n.translate('xpack.lens.datatypes.date', { defaultMessage: 'date' }),
};

export function IndexPatternDataPanel(props: DatasourceDataPanelProps<IndexPatternPrivateState>) {
  const [nameFilter, setNameFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<DataType[]>([]);
  const [pageSize, setPageSize] = useState(PAGINATION_SIZE);
  const [showIndexPatternSwitcher, setShowIndexPatternSwitcher] = useState(false);
  const [isTypeFilterOpen, setTypeFilterOpen] = useState(false);
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
  }, [nameFilter, typeFilter, props.state.currentIndexPatternId]);

  if (Object.keys(props.state.indexPatterns).length === 0) {
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

  const allFields = props.state.indexPatterns[props.state.currentIndexPatternId].fields;
  const filteredFields = allFields
    .filter(
      (field: IndexPatternField) =>
        field.name.toLowerCase().includes(nameFilter.toLowerCase()) &&
        supportedFieldTypes.includes(field.type)
    )
    .slice(0, pageSize);

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
                  <h4
                    className="lnsIndexPatternDataPanel__header"
                    title={props.state.indexPatterns[props.state.currentIndexPatternId].title}
                  >
                    {props.state.indexPatterns[props.state.currentIndexPatternId].title}{' '}
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
          <EuiFlexGroup gutterSize="m" className="lnsIndexPatternDataPanel__filter-wrapper">
            <EuiFlexItem grow={true}>
              <EuiFieldSearch
                placeholder={i18n.translate('xpack.lens.indexPatterns.filterByNameLabel', {
                  defaultMessage: 'Search fields',
                  description:
                    'Search the list of fields in the index pattern for the provided text',
                })}
                value={nameFilter}
                onChange={e => {
                  setNameFilter(e.target.value);
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
                  isOpen={isTypeFilterOpen}
                  closePopover={() => setTypeFilterOpen(false)}
                  button={
                    <EuiFilterButton
                      onClick={() => setTypeFilterOpen(!isTypeFilterOpen)}
                      iconType="arrowDown"
                      data-test-subj="indexPatternTypeFilterButton"
                      isSelected={isTypeFilterOpen}
                      numFilters={availableFieldTypes.length}
                      hasActiveFilters={availableFilteredTypes.length > 0}
                      numActiveFilters={availableFilteredTypes.length}
                    >
                      {i18n.translate('xpack.lens.indexPatterns.typeFilterLabel', {
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
            <div
              className="lnsFieldListPanel__overflow"
              ref={el => {
                if (el && !el.dataset.dynamicScroll) {
                  el.dataset.dynamicScroll = 'true';
                  setScrollContainer(el);
                }
              }}
              onScroll={lazyScroll}
            >
              {filteredFields
                .filter(
                  field => typeFilter.length === 0 || typeFilter.includes(field.type as DataType)
                )
                .sort(sortFields)
                .map(field => (
                  <FieldItem key={field.name} field={field} highlight={nameFilter.toLowerCase()} />
                ))}
            </div>
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>
    </ChildDragDropProvider>
  );
}
