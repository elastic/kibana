/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiSelectable,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiButtonEmpty,
  EuiHorizontalRule,
  EuiIcon,
  EuiHighlight,
  useEuiTheme,
} from '@elastic/eui';

import { isEmpty } from 'lodash';
import type { CasesUI } from '../../../../common';
import * as i18n from './translations';
import { useItemsState } from '../use_items_state';
import type { ItemSelectableOption, ItemsSelectionState } from '../types';

interface Props {
  selectedCases: CasesUI;
  tags: string[];
  isLoading: boolean;
  onChangeTags: (args: ItemsSelectionState) => void;
}

const hasExactMatch = (searchValue: string, options: ItemSelectableOption[]) => {
  return options.some((option) => option.key === searchValue);
};

const hasPartialMatch = (searchValue: string, options: ItemSelectableOption[]) => {
  return options.some((option) => option.key?.includes(searchValue));
};

const itemToSelectableOption = (item: {
  key: string;
  data: Record<string, unknown>;
}): ItemSelectableOption => {
  return {
    key: item.key,
    label: item.key,
    'data-test-subj': `cases-actions-tags-edit-selectable-tag-${item.key}`,
  } as ItemSelectableOption;
};

const EditTagsSelectableComponent: React.FC<Props> = ({
  selectedCases,
  tags,
  isLoading,
  onChangeTags,
}) => {
  const { state, options, totalSelectedItems, onChange, onSelectAll, onSelectNone } = useItemsState(
    {
      items: tags,
      selectedCases,
      itemToSelectableOption,
      fieldSelector: (theCase) => theCase.tags,
      onChangeItems: onChangeTags,
    }
  );

  const [searchValue, setSearchValue] = useState<string>('');
  const { euiTheme } = useEuiTheme();

  const renderOption = useCallback(
    (option: ItemSelectableOption, search: string) => {
      const dataTestSubj = option.newItem
        ? 'cases-actions-tags-edit-selectable-add-new-tag-icon'
        : `cases-actions-tags-edit-selectable-tag-${option.label}-icon-${option.itemIcon}`;

      return (
        <>
          <EuiIcon
            type={option.itemIcon}
            data-test-subj={dataTestSubj}
            css={{ flexShrink: 0, marginRight: euiTheme.size.m }}
          />
          <EuiHighlight search={search}>{option.label}</EuiHighlight>
        </>
      );
    },
    [euiTheme]
  );

  /**
   * While the user searches we need to add the ability
   * to add the search term as a new tag. The no matches message
   * is not enough because a search term can partial match to some tags
   * but the user will still need to add the search term as tag.
   * For that reason, we always add a "fake" option ("add new tag" option) which will serve as a
   * the button with which the user can add a new tag. We do not show
   * the "add new tag" option if there is an exact match.
   */
  const optionsWithAddNewTagOption = useMemo(() => {
    if (!isEmpty(searchValue) && !hasExactMatch(searchValue, options)) {
      return [
        {
          key: searchValue,
          label: i18n.ADD_TAG_CUSTOM_OPTION_LABEL(searchValue),
          'data-test-subj': 'cases-actions-tags-edit-selectable-add-new-tag',
          data: { itemIcon: 'empty', newItem: true },
        },
        ...options,
      ] as ItemSelectableOption[];
    }

    return options;
  }, [options, searchValue]);

  const showNoMatchText = useMemo(
    () => !hasPartialMatch(searchValue, options) && Object.keys(state.items).length > 0,
    [options, searchValue, state.items]
  );

  return (
    <EuiSelectable
      options={optionsWithAddNewTagOption}
      searchable
      searchProps={{
        placeholder: i18n.SEARCH_PLACEHOLDER,
        isLoading,
        isClearable: !isLoading,
        onChange: setSearchValue,
        value: searchValue,
        'data-test-subj': 'cases-actions-tags-edit-selectable-search-input',
      }}
      renderOption={renderOption}
      listProps={{ showIcons: false }}
      onChange={onChange}
      noMatchesMessage={i18n.NO_SEARCH_MATCH}
      emptyMessage={i18n.NO_TAGS_AVAILABLE}
      data-test-subj="cases-actions-tags-edit-selectable"
      height="full"
    >
      {(list, search) => (
        <>
          {search}
          <EuiSpacer size="s" />
          <EuiFlexGroup
            alignItems="center"
            justifyContent="spaceBetween"
            responsive={false}
            direction="row"
            css={{ flexGrow: 0 }}
            gutterSize="none"
          >
            <EuiFlexItem
              grow={false}
              css={{
                borderRight: euiTheme.border.thin,
                paddingRight: euiTheme.size.s,
              }}
            >
              <EuiText size="xs" color="subdued">
                {i18n.TOTAL_TAGS(tags.length)}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem
              grow={false}
              css={{
                paddingLeft: euiTheme.size.s,
              }}
            >
              <EuiText size="xs" color="subdued">
                {i18n.SELECTED_TAGS(totalSelectedItems)}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false} css={{ marginLeft: 'auto' }}>
              <EuiFlexGroup
                responsive={false}
                direction="row"
                alignItems="center"
                justifyContent="flexEnd"
                gutterSize="xs"
              >
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty size="xs" flush="right" onClick={onSelectAll}>
                    {i18n.SELECT_ALL}
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty size="xs" flush="right" onClick={onSelectNone}>
                    {i18n.SELECT_NONE}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiHorizontalRule margin="m" />
          {showNoMatchText ? (
            <EuiText
              size="xs"
              color="subdued"
              textAlign="center"
              css={{
                marginBottom: euiTheme.size.s,
              }}
              data-test-subj="cases-actions-tags-edit-selectable-no-match-label"
            >
              {i18n.NO_SEARCH_MATCH}
            </EuiText>
          ) : null}
          {list}
        </>
      )}
    </EuiSelectable>
  );
};

EditTagsSelectableComponent.displayName = 'EditTagsSelectable';

export const EditTagsSelectable = React.memo(EditTagsSelectableComponent);
