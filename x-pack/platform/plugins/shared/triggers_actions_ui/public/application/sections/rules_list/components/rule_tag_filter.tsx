/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiSelectable,
  EuiFilterButton,
  EuiFilterGroup,
  EuiPopover,
  EuiSelectableProps,
  EuiSelectableOption,
  EuiSpacer,
} from '@elastic/eui';
import { useLoadTagsQuery } from '../../../hooks/use_load_tags_query';

export interface RuleTagFilterProps {
  selectedTags: string[];
  isGrouped?: boolean; // Whether or not this should appear as the child of a EuiFilterGroup
  canLoadRules?: boolean;
  refresh?: Date;
  loadingMessage?: EuiSelectableProps['loadingMessage'];
  noMatchesMessage?: EuiSelectableProps['noMatchesMessage'];
  emptyMessage?: EuiSelectableProps['emptyMessage'];
  errorMessage?: EuiSelectableProps['errorMessage'];
  dataTestSubj?: string;
  selectableDataTestSubj?: string;
  optionDataTestSubj?: (tag: string) => string;
  buttonDataTestSubj?: string;
  onChange: (tags: string[]) => void;
}

const getOptionDataTestSubj = (tag: string) => `ruleTagFilterOption-${tag}`;

const loadingText = i18n.translate('xpack.triggersActionsUI.sections.ruleTagFilter.loading', {
  defaultMessage: 'Loading tags',
});

const EMPTY_TAGS: string[] = [];

const OptionWrapper = memo(
  ({
    label,
    setObserver,
    canSetObserver,
  }: {
    label: string;
    setObserver: (ref: HTMLDivElement) => void;
    canSetObserver: boolean;
  }) => {
    const internalSetObserver = useCallback(
      (ref: HTMLDivElement | null) => {
        if (canSetObserver && ref) {
          setObserver(ref);
        }
      },
      [canSetObserver, setObserver]
    );

    return <div ref={internalSetObserver}>{label}</div>;
  }
);

const RuleTagFilterPopoverButton = memo(
  ({
    selectedTags,
    onClosePopover,
    buttonDataTestSubj,
  }: {
    selectedTags: string[];
    onClosePopover: () => void;
    buttonDataTestSubj?: string;
  }) => {
    return (
      <EuiFilterButton
        data-test-subj={buttonDataTestSubj}
        iconType="arrowDown"
        hasActiveFilters={selectedTags.length > 0}
        numActiveFilters={selectedTags.length}
        numFilters={selectedTags.length}
        onClick={onClosePopover}
      >
        <FormattedMessage
          id="xpack.triggersActionsUI.sections.rulesList.ruleTagFilterButton"
          defaultMessage="Tags"
        />
      </EuiFilterButton>
    );
  }
);

const RuleTagFilterList = memo(
  ({
    options,
    renderOption,
    onChange,
    onSearchTextChange,
    isLoading,
    loadingMessage,
    noMatchesMessage,
    emptyMessage,
    errorMessage,
    selectableDataTestSubj,
  }: {
    options: EuiSelectableOption[];
    onChange: (options: EuiSelectableOption[]) => void;
    renderOption: EuiSelectableProps['renderOption'];
    onSearchTextChange: (searchText: string) => void;
    isLoading: boolean;
    loadingMessage?: EuiSelectableProps['loadingMessage'];
    noMatchesMessage?: EuiSelectableProps['noMatchesMessage'];
    emptyMessage?: EuiSelectableProps['emptyMessage'];
    errorMessage?: EuiSelectableProps['errorMessage'];
    selectableDataTestSubj?: string;
  }) => {
    return (
      <EuiSelectable
        searchable
        searchProps={{
          onChange: onSearchTextChange,
        }}
        listProps={{
          // We need to specify undefined here as the selectable list will
          // sometimes scroll to the first item in the list when paginating
          activeOptionIndex: undefined,
        }}
        data-test-subj={selectableDataTestSubj}
        options={options}
        noMatchesMessage={isLoading ? loadingMessage : noMatchesMessage}
        emptyMessage={isLoading ? loadingMessage : emptyMessage}
        errorMessage={errorMessage}
        renderOption={renderOption}
        onChange={onChange}
      >
        {(list, search) => (
          <>
            {search}
            <EuiSpacer size="xs" />
            {list}
          </>
        )}
      </EuiSelectable>
    );
  }
);

export const RuleTagFilter = memo((props: RuleTagFilterProps) => {
  const {
    selectedTags = EMPTY_TAGS,
    isGrouped = false,
    canLoadRules = true,
    refresh,
    loadingMessage = loadingText,
    noMatchesMessage,
    emptyMessage,
    errorMessage,
    dataTestSubj = 'ruleTagFilter',
    selectableDataTestSubj = 'ruleTagFilterSelectable',
    optionDataTestSubj = getOptionDataTestSubj,
    buttonDataTestSubj = 'ruleTagFilterButton',
    onChange = () => {},
  } = props;

  const observerRef = useRef<IntersectionObserver>();
  const [searchText, setSearchText] = useState<string>('');
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

  const {
    tags = EMPTY_TAGS,
    isLoading,
    hasNextPage,
    fetchNextPage,
  } = useLoadTagsQuery({
    enabled: canLoadRules,
    refresh,
    search: searchText,
  });

  const fetchNext = useCallback(async () => {
    if (hasNextPage && !isLoading) {
      await fetchNextPage();
      observerRef.current?.disconnect();
    }
  }, [fetchNextPage, hasNextPage, isLoading]);

  useEffect(() => {
    return () => observerRef.current?.disconnect();
  }, []);

  const allTags = useMemo(() => {
    return [...new Set(selectedTags.sort().concat(tags))];
  }, [selectedTags, tags]);

  // Attaches an intersection observer to the last element
  // to trigger a callback to paginate when the user scrolls to it
  const setObserver = useCallback(
    (ref: HTMLDivElement) => {
      observerRef.current?.disconnect();
      observerRef.current = new IntersectionObserver(fetchNext, {
        root: null,
        threshold: 1,
      });
      observerRef.current?.observe(ref);
    },
    [fetchNext]
  );

  const options: EuiSelectableOption[] = useMemo(
    () =>
      allTags.map((tag) => ({
        label: tag,
        checked: selectedTags.includes(tag) ? ('on' as const) : undefined,
        'data-test-subj': optionDataTestSubj(tag),
      })),
    [allTags, selectedTags, optionDataTestSubj]
  );

  const renderOption = useCallback(
    (option: EuiSelectableOption) => {
      return (
        <OptionWrapper
          label={option.label}
          setObserver={setObserver}
          canSetObserver={option.label === allTags[allTags.length - 1]}
        />
      );
    },
    [setObserver, allTags]
  );

  const onChangeInternal = useCallback(
    (newOptions: EuiSelectableOption[]) => {
      const newSelectedTags = newOptions.reduce<string[]>((result, option) => {
        if (option.checked === 'on') {
          result = [...result, option.label];
        }
        return result;
      }, []);

      onChange(newSelectedTags);
    },
    [onChange]
  );

  const onSearchTextChange = useCallback(
    (newSearchText: string) => {
      setSearchText(newSearchText);
    },
    [setSearchText]
  );

  const onClosePopover = useCallback(() => {
    setIsPopoverOpen((prevIsPopoverOpen) => !prevIsPopoverOpen);
  }, [setIsPopoverOpen]);

  const Container = useMemo(() => {
    if (isGrouped) {
      return React.Fragment;
    }
    return EuiFilterGroup;
  }, [isGrouped]);

  return (
    <Container {...(isGrouped ? {} : { 'data-test-subj': 'ruleTagFilterUngrouped' })}>
      <EuiPopover
        data-test-subj={dataTestSubj}
        isOpen={isPopoverOpen}
        closePopover={onClosePopover}
        button={
          <RuleTagFilterPopoverButton
            selectedTags={selectedTags}
            onClosePopover={onClosePopover}
            buttonDataTestSubj={buttonDataTestSubj}
          />
        }
      >
        <RuleTagFilterList
          isLoading={isLoading}
          options={options}
          renderOption={renderOption}
          onChange={onChangeInternal}
          onSearchTextChange={onSearchTextChange}
          loadingMessage={loadingMessage}
          noMatchesMessage={noMatchesMessage}
          emptyMessage={emptyMessage}
          errorMessage={errorMessage}
          selectableDataTestSubj={selectableDataTestSubj}
        />
      </EuiPopover>
    </Container>
  );
});

// eslint-disable-next-line import/no-default-export
export { RuleTagFilter as default };
