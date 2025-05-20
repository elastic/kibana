/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButtonEmpty,
  EuiFilterButton,
  EuiFilterGroup,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiSelectable,
  EuiSelectableOption,
} from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useDispatch } from '../../../../components/mappings_editor/mappings_state_context';
import { State } from '../../../../components/mappings_editor/types';
import {
  getFieldsFromState,
  getFieldsMatchingFilterFromState,
  searchFields,
} from '../../../../components/mappings_editor/lib';

interface Props {
  isAddingFields: boolean;
  isJSONVisible: boolean;
  previousState: State;
  setPreviousState: (state: State) => void;
  state: State;
}
export const MappingsFilter: React.FC<Props> = ({
  isAddingFields,
  isJSONVisible,
  previousState,
  setPreviousState,
  state,
}) => {
  const [isFilterByPopoverVisible, setIsFilterPopoverVisible] = useState<boolean>(false);
  const dispatch = useDispatch();

  const isClearAllFilterDisabled = !isAddingFields
    ? state.filter.selectedOptions.filter(
        (option) => option.checked === 'on' || option.checked === 'off'
      ).length === 0
    : previousState.filter.selectedOptions.filter(
        (option) => option.checked === 'on' || option.checked === 'off'
      ).length === 0;

  const setSelectedOptions = useCallback(
    (options: EuiSelectableOption[]) => {
      dispatch({
        type: 'filter:update',
        value: {
          selectedOptions: options,
        },
      });
      dispatch({
        type: 'search:update',
        value: state.search.term,
      });
    },
    [dispatch, state.search.term]
  );
  const setPreviousStateSelectedOptions = useCallback(
    (options: EuiSelectableOption[]) => {
      const selectedDataTypes: string[] = options
        .filter((option) => option.checked === 'on')
        .map((option) => option.label);

      setPreviousState({
        ...previousState,
        filter: {
          filteredFields: getFieldsFromState(
            previousState.fields,
            selectedDataTypes.length > 0 ? selectedDataTypes : undefined
          ),
          selectedOptions: options,
          selectedDataTypes,
        },
        search: {
          term: previousState.search.term,
          result: searchFields(
            previousState.search.term,
            selectedDataTypes.length > 0
              ? getFieldsMatchingFilterFromState(previousState, selectedDataTypes)
              : previousState.fields.byId
          ),
        },
      });
    },
    [previousState, setPreviousState]
  );
  const filterByFieldTypeButton = (
    <EuiFilterButton
      iconType="arrowDown"
      iconSide="right"
      isDisabled={isJSONVisible}
      onClick={() => setIsFilterPopoverVisible(!isFilterByPopoverVisible)}
      numFilters={
        !isAddingFields
          ? state.filter.selectedOptions.length
          : previousState.filter.selectedOptions.length
      }
      hasActiveFilters={
        !isAddingFields
          ? state.filter.selectedDataTypes.length > 0
          : previousState.filter.selectedDataTypes.length > 0
      }
      numActiveFilters={
        !isAddingFields
          ? state.filter.selectedDataTypes.length
          : previousState.filter.selectedDataTypes.length
      }
      isSelected={isFilterByPopoverVisible}
      data-test-subj="indexDetailsMappingsFilterByFieldTypeButton"
    >
      {i18n.translate('xpack.idxMgmt.indexDetails.mappings.filterByFieldType.button', {
        defaultMessage: 'Field types',
      })}
    </EuiFilterButton>
  );
  return (
    <EuiFilterGroup>
      <EuiPopover
        button={filterByFieldTypeButton}
        isOpen={isFilterByPopoverVisible}
        closePopover={() => setIsFilterPopoverVisible(!isFilterByPopoverVisible)}
        anchorPosition="downCenter"
        data-test-subj="indexDetailsMappingsFilter"
        panelPaddingSize="none"
      >
        <EuiSelectable
          searchable
          data-test-subj="filterItem"
          searchProps={{
            placeholder: i18n.translate(
              'xpack.idxMgmt.indexDetails.mappings.filterByFieldType.searchPlaceholder',
              {
                defaultMessage: 'Filter list ',
              }
            ),
          }}
          options={
            !isAddingFields ? state.filter.selectedOptions : previousState.filter.selectedOptions
          }
          onChange={(options) => {
            if (!isAddingFields) {
              setSelectedOptions(options);
            } else {
              setPreviousStateSelectedOptions(options);
            }
          }}
        >
          {(list, search) => (
            <div style={{ width: 200 }}>
              <EuiPopoverTitle
                paddingSize="s"
                data-test-subj="indexDetailsMappingsFilterByFieldTypeSearch"
              >
                {search}
              </EuiPopoverTitle>
              {list}
            </div>
          )}
        </EuiSelectable>
        <EuiPopoverFooter paddingSize="s">
          <EuiButtonEmpty
            color="danger"
            iconSide="left"
            size="s"
            css={{ width: '100%' }}
            iconType="cross"
            data-test-subj="clearFilters"
            disabled={isClearAllFilterDisabled}
            onClick={() => {
              if (!isAddingFields) {
                state.filter.selectedOptions.filter((option) => {
                  if (option.checked === 'on') {
                    option.checked = undefined;
                  }
                });
                setSelectedOptions(state.filter.selectedOptions);
              } else {
                previousState.filter.selectedOptions.filter((option) => {
                  if (option.checked === 'on') {
                    option.checked = undefined;
                  }
                });
                setPreviousStateSelectedOptions(previousState.filter.selectedOptions);
              }
            }}
          >
            {i18n.translate(
              'xpack.idxMgmt.indexDetails.mappings.filterByFieldType.filter.clearAll',
              {
                defaultMessage: 'Clear all ',
              }
            )}
          </EuiButtonEmpty>
        </EuiPopoverFooter>
      </EuiPopover>
    </EuiFilterGroup>
  );
};
