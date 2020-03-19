/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonIcon, EuiPopover, EuiSelectableOption } from '@elastic/eui';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { connect, ConnectedProps } from 'react-redux';
import { OpenTimelineResult } from '../../open_timeline/types';
import { SelectableTimeline } from '../selectable_timeline';
import * as i18n from '../translations';
// import { State, timelineSelectors } from '../../../store';
// import { TimelineById } from '../../../store/timeline/types';
// import { DEFAULT_TIMELINE_WIDTH } from '../body/constants';
import { timelineActions } from '../../../store/timeline';

interface InsertTimelinePopoverProps {
  isDisabled: boolean;
  hideUntitled?: boolean;
  onTimelineChange: (timelineTitle: string, timelineId: string | null) => void;
}

interface RouterState {
  insertTimeline: {
    timelineId: string;
    timelineTitle: string;
  };
}

type Props = InsertTimelinePopoverProps & PropsFromRedux;

export const InsertTimelinePopoverComponent: React.FC<Props> = ({
  isDisabled,
  hideUntitled = false,
  onTimelineChange,
  showTimeline,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { state } = useLocation();
  const [routerState, setRouterState] = useState<RouterState | null>(state ?? null);

  useEffect(() => {
    if (routerState && routerState.insertTimeline) {
      showTimeline({ id: routerState.insertTimeline.timelineId, show: false });
      onTimelineChange(
        routerState.insertTimeline.timelineTitle,
        routerState.insertTimeline.timelineId
      );
      setRouterState(null);
    }
  }, [routerState]);

  const handleClosePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, []);

  const handleOpenPopover = useCallback(() => {
    setIsPopoverOpen(true);
  }, []);

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

  const handleGetSelectableOptions = useCallback(
    ({ timelines }) => [
      ...timelines.map(
        (t: OpenTimelineResult, index: number) =>
          ({
            description: t.description,
            favorite: t.favorite,
            label: t.title,
            id: t.savedObjectId,
            key: `${t.title}-${index}`,
            title: t.title,
            checked: undefined,
          } as EuiSelectableOption)
      ),
    ],
    []
  );

  return (
    <EuiPopover
      data-test-subj="insert-timeline-popover"
      id="searchTimelinePopover"
      button={insertTimelineButton}
      isOpen={isPopoverOpen}
      closePopover={handleClosePopover}
    >
      <SelectableTimeline
        hideUntitled={hideUntitled}
        getSelectableOptions={handleGetSelectableOptions}
        onClosePopover={handleClosePopover}
        onTimelineChange={onTimelineChange}
      />
    </EuiPopover>
  );
};

const mapDispatchToProps = {
  showTimeline: timelineActions.showTimeline,
};

const connector = connect(null, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const InsertTimelinePopover = connector(memo(InsertTimelinePopoverComponent));
