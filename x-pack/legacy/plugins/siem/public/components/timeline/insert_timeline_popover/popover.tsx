/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiHighlight,
  EuiPopover,
  EuiSelectable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiTextColor,
  EuiFilterButton,
  EuiFilterGroup,
  EuiPortal,
  EuiButtonIcon,
  EuiSelectableOption,
} from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React, { memo, useCallback, useMemo, useState } from 'react';
import { ListProps } from 'react-virtualized';
import styled from 'styled-components';
import { AllTimelinesQuery } from '../../../containers/timeline/all';
import { getEmptyTagValue } from '../../empty_value';
import { isUntitled } from '../../open_timeline/helpers';
import * as i18nTimeline from '../../open_timeline/translations';
import { SortFieldTimeline, Direction } from '../../../graphql/types';
import * as i18n from '../search_super_select/translations';

const MyEuiFlexItem = styled(EuiFlexItem)`
  display: inline-block;
  max-width: 296px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const EuiSelectableContainer = styled.div<{ isLoading: boolean }>`
  .euiSelectable {
    .euiFormControlLayout__childrenWrapper {
      display: flex;
    }
    ${({ isLoading }) => `${
      isLoading
        ? `
      .euiFormControlLayoutIcons {
        display: none;
      }
      .euiFormControlLayoutIcons.euiFormControlLayoutIcons--right {
        display: block;
        left: 12px;
        top: 12px;
      }`
        : ''
    }
    `}
  }
`;

const MyEuiFlexGroup = styled(EuiFlexGroup)`
  padding 0px 4px;
`;

interface InsertTimelinePopoverProps {
  isDisabled: boolean;
  hideUntitled?: boolean;
  onTimelineChange: (timelineTitle: string, timelineId: string | null) => void;
}

const ORIGINAL_PAGE_SIZE = 50;
const POPOVER_HEIGHT = 260;
const TIMELINE_ITEM_HEIGHT = 50;
const InsertTimelinePopoverComponent: React.FC<InsertTimelinePopoverProps> = ({
  isDisabled,
  hideUntitled = false,
  onTimelineChange,
}) => {
  const [pageSize, setPageSize] = useState(ORIGINAL_PAGE_SIZE);
  const [heightTrigger, setHeightTrigger] = useState(0);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [searchTimelineValue, setSearchTimelineValue] = useState('');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [searchRef, setSearchRef] = useState<HTMLElement | null>(null);

  const onSearchTimeline = useCallback(val => {
    setSearchTimelineValue(val);
  }, []);

  const handleClosePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, []);

  const handleOpenPopover = useCallback(() => {
    setIsPopoverOpen(true);
  }, []);

  const handleOnToggleOnlyFavorites = useCallback(() => {
    setOnlyFavorites(!onlyFavorites);
  }, [onlyFavorites]);

  const renderTimelineOption = useCallback((option, searchValue) => {
    return (
      <EuiFlexGroup
        gutterSize="s"
        justifyContent="spaceBetween"
        alignItems="center"
        responsive={false}
      >
        <EuiFlexItem grow={false}>
          <EuiIcon type={`${option.checked === 'on' ? 'check' : 'none'}`} color="primary" />
        </EuiFlexItem>
        <EuiFlexItem grow={true}>
          <EuiFlexGroup gutterSize="none" direction="column">
            <MyEuiFlexItem grow={false}>
              <EuiHighlight search={searchValue}>
                {isUntitled(option) ? i18nTimeline.UNTITLED_TIMELINE : option.title}
              </EuiHighlight>
            </MyEuiFlexItem>
            <MyEuiFlexItem grow={false}>
              <EuiTextColor color="subdued" component="span">
                <small>
                  {option.description != null && option.description.trim().length > 0
                    ? option.description
                    : getEmptyTagValue()}
                </small>
              </EuiTextColor>
            </MyEuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIcon
            type={`${
              option.favorite != null && isEmpty(option.favorite) ? 'starEmpty' : 'starFilled'
            }`}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }, []);

  const handleTimelineChange = useCallback(
    options => {
      const selectedTimeline = options.filter(
        (option: { checked: string }) => option.checked === 'on'
      );
      if (selectedTimeline != null && selectedTimeline.length > 0) {
        onTimelineChange(
          isEmpty(selectedTimeline[0].title)
            ? i18nTimeline.UNTITLED_TIMELINE
            : selectedTimeline[0].title,
          selectedTimeline[0].id
        );
      }
      setIsPopoverOpen(false);
    },
    [onTimelineChange]
  );

  const handleOnScroll = useCallback(
    (
      totalTimelines: number,
      totalCount: number,
      {
        clientHeight,
        scrollHeight,
        scrollTop,
      }: {
        clientHeight: number;
        scrollHeight: number;
        scrollTop: number;
      }
    ) => {
      if (totalTimelines < totalCount) {
        const clientHeightTrigger = clientHeight * 1.2;
        if (
          scrollTop > 10 &&
          scrollHeight - scrollTop < clientHeightTrigger &&
          scrollHeight > heightTrigger
        ) {
          setHeightTrigger(scrollHeight);
          setPageSize(pageSize + ORIGINAL_PAGE_SIZE);
        }
      }
    },
    [heightTrigger, pageSize]
  );

  const insertTimelineButton = useMemo(
    () => (
      <EuiButtonIcon
        aria-label={i18n.INSERT_TIMELINE}
        data-test-subj="insert-timeline-button"
        iconType="timeline"
        isDisabled={isDisabled}
        onClick={handleOpenPopover}
      />
    ),
    [handleOpenPopover, isDisabled]
  );

  const favoritePortal = useMemo(
    () =>
      searchRef != null ? (
        <EuiPortal insert={{ sibling: searchRef, position: 'after' }}>
          <MyEuiFlexGroup gutterSize="xs" justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiFilterGroup>
                <EuiFilterButton
                  size="l"
                  data-test-subj="only-favorites-toggle"
                  hasActiveFilters={onlyFavorites}
                  onClick={handleOnToggleOnlyFavorites}
                >
                  {i18nTimeline.ONLY_FAVORITES}
                </EuiFilterButton>
              </EuiFilterGroup>
            </EuiFlexItem>
          </MyEuiFlexGroup>
        </EuiPortal>
      ) : null,
    [searchRef, onlyFavorites, handleOnToggleOnlyFavorites]
  );

  return (
    <EuiPopover
      id="searchTimelinePopover"
      button={insertTimelineButton}
      isOpen={isPopoverOpen}
      closePopover={handleClosePopover}
    >
      <AllTimelinesQuery
        pageInfo={{
          pageIndex: 1,
          pageSize,
        }}
        search={searchTimelineValue}
        sort={{ sortField: SortFieldTimeline.updated, sortOrder: Direction.desc }}
        onlyUserFavorite={onlyFavorites}
      >
        {({ timelines, loading, totalCount }) => (
          <EuiSelectableContainer isLoading={loading}>
            <EuiSelectable
              height={POPOVER_HEIGHT}
              isLoading={loading && timelines.length === 0}
              listProps={{
                rowHeight: TIMELINE_ITEM_HEIGHT,
                showIcons: false,
                virtualizedProps: ({
                  onScroll: handleOnScroll.bind(
                    null,
                    timelines.filter(t => !hideUntitled || t.title !== '').length,
                    totalCount
                  ),
                } as unknown) as ListProps,
              }}
              renderOption={renderTimelineOption}
              onChange={handleTimelineChange}
              searchable
              searchProps={{
                'data-test-subj': 'timeline-super-select-search-box',
                isLoading: loading,
                placeholder: i18n.SEARCH_BOX_TIMELINE_PLACEHOLDER,
                onSearch: onSearchTimeline,
                incremental: false,
                inputRef: (ref: HTMLElement) => {
                  setSearchRef(ref);
                },
              }}
              singleSelection={true}
              options={[
                ...timelines
                  .filter(t => !hideUntitled || t.title !== '')
                  .map((t, index) => {
                    return {
                      description: t.description,
                      favorite: t.favorite,
                      label: t.title,
                      id: t.savedObjectId,
                      key: `${t.title}-${index}`,
                      title: t.title,
                      checked: undefined,
                    } as EuiSelectableOption;
                  }),
              ]}
            >
              {(list, search) => (
                <>
                  {search}
                  {favoritePortal}
                  {list}
                </>
              )}
            </EuiSelectable>
          </EuiSelectableContainer>
        )}
      </AllTimelinesQuery>
    </EuiPopover>
  );
};
export const InsertTimelinePopover = memo(InsertTimelinePopoverComponent);
