/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonIcon, EuiPopover, EuiSelectableOption } from '@elastic/eui';
import React, { memo, useCallback, useMemo, useState } from 'react';

import { OpenTimelineResult } from '../../open_timeline/types';
import { SelectableTimeline } from '../selectable_timeline';
import * as i18n from '../translations';

interface InsertTimelinePopoverProps {
  isDisabled: boolean;
  hideUntitled?: boolean;
  onTimelineChange: (timelineTitle: string, timelineId: string | null) => void;
}

const InsertTimelinePopoverComponent: React.FC<InsertTimelinePopoverProps> = ({
  isDisabled,
  hideUntitled = false,
  onTimelineChange,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

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
    [hideUntitled]
  );

  return (
    <EuiPopover
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

export const InsertTimelinePopover = memo(InsertTimelinePopoverComponent);
