/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiHighlight,
  EuiInputPopover,
  EuiSuperSelect,
  EuiSelectable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTextColor,
  EuiFilterButton,
  EuiFilterGroup,
  EuiSpacer,
} from '@elastic/eui';
import { Option } from '@elastic/eui/src/components/selectable/types';
import React, { memo, useCallback, useMemo, useState } from 'react';
import { ListProps } from 'react-virtualized';
import { createGlobalStyle } from 'styled-components';

import { AllTimelinesQuery } from '../../../containers/timeline/all';
import { getEmptyTagValue } from '../../empty_value';
import { isUntitled } from '../../../components/open_timeline/helpers';
import * as i18nTimeline from '../../../components/open_timeline/translations';
import { SortFieldTimeline, Direction } from '../../../graphql/types';

import * as i18n from './translations';

const SearchTimelineSuperSelectGlobalStyle = createGlobalStyle`
  .euiPopover__panel.euiPopover__panel-isOpen.timeline-search-super-select-popover__popoverPanel {
    visibility: hidden;
    z-index: 0;
  }
`;

interface SearchTimelineSuperSelectProps {
  isDisabled: boolean;
  timelineId: string | null;
  timelineTitle: string | null;
  onTimelineChange: (timelineTitle: string, timelineId: string) => void;
}

const basicSuperSelectOptions = [
  {
    value: '-1',
    inputDisplay: i18n.DEFAULT_TIMELINE_TITLE,
  },
];

const basicSelectableOptions = [
  {
    description: i18n.DEFAULT_TIMELINE_DESCRIPTION,
    label: i18n.DEFAULT_TIMELINE_TITLE,
    id: null,
    title: i18n.DEFAULT_TIMELINE_TITLE,
  } as Option,
];

const OriginalPageSize = 50;
const PopoverHeight = 260;
const TimelineItemHeight = 50;

export const SearchTimelineSuperSelect = memo<SearchTimelineSuperSelectProps>(
  ({ isDisabled, timelineId, timelineTitle, onTimelineChange }) => {
    const [pageSize, setPageSize] = useState(OriginalPageSize);
    const [heightTrigger, setHeightTrigger] = useState(0);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [searchTimelineValue, setSearchTimelineValue] = useState('');
    const [onlyFavorites, setOnlyFavorites] = useState(false);

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
        <>
          <EuiHighlight search={searchValue}>
            {isUntitled(option) ? i18nTimeline.UNTITLED_TIMELINE : option.title}
          </EuiHighlight>
          <br />
          <EuiTextColor color="subdued">
            <small>
              {option.description != null && option.description.trim().length > 0
                ? option.description
                : getEmptyTagValue()}
            </small>
          </EuiTextColor>
        </>
      );
    }, []);

    const handleTimelineChange = useCallback(options => {
      const selectedTimeline = options.filter(
        (option: { checked: string }) => option.checked === 'on'
      );
      if (selectedTimeline != null && selectedTimeline.length > 0 && onTimelineChange != null) {
        onTimelineChange(selectedTimeline[0].title, selectedTimeline[0].id);
      }
      setIsPopoverOpen(false);
    }, []);

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
            setPageSize(pageSize + OriginalPageSize);
          }
        }
      },
      [heightTrigger, pageSize]
    );

    const superSelect = useMemo(
      () => (
        <EuiSuperSelect
          disabled={isDisabled}
          onFocus={handleOpenPopover}
          options={
            timelineId == null
              ? basicSuperSelectOptions
              : [
                  {
                    value: timelineId,
                    inputDisplay: timelineTitle,
                  },
                ]
          }
          valueOfSelected={timelineId == null ? '-1' : timelineId}
          itemLayoutAlign="top"
          hasDividers={false}
          popoverClassName="timeline-search-super-select-popover"
        />
      ),
      [handleOpenPopover, timelineId, timelineTitle]
    );

    return (
      <EuiInputPopover
        id="searchTimelinePopover"
        input={superSelect}
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
            <>
              <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
                <EuiFlexItem grow={false}>
                  <EuiFilterGroup>
                    <EuiFilterButton
                      size="xs"
                      data-test-subj="only-favorites-toggle"
                      hasActiveFilters={onlyFavorites}
                      onClick={handleOnToggleOnlyFavorites}
                    >
                      {i18nTimeline.ONLY_FAVORITES}
                    </EuiFilterButton>
                  </EuiFilterGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="xs" />
              <EuiSelectable
                height={PopoverHeight}
                isLoading={loading && timelines.length === 0}
                listProps={{
                  rowHeight: TimelineItemHeight,
                  showIcons: false,
                  virtualizedProps: ({
                    onScroll: handleOnScroll.bind(null, timelines.length, totalCount),
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
                }}
                singleSelection={true}
                options={[
                  ...basicSelectableOptions,
                  ...timelines.map(
                    (t, index) =>
                      ({
                        description: t.description,
                        label: t.title,
                        id: t.savedObjectId,
                        key: `${t.title}-${index}`,
                        title: t.title,
                      } as Option)
                  ),
                ]}
              >
                {(list, search) => (
                  <>
                    {search}
                    {list}
                  </>
                )}
              </EuiSelectable>
            </>
          )}
        </AllTimelinesQuery>
        <SearchTimelineSuperSelectGlobalStyle />
      </EuiInputPopover>
    );
  }
);
// onChange={this.onChange}
