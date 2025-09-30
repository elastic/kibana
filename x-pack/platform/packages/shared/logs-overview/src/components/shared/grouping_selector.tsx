/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiContextMenuItem, EuiContextMenuPanel, EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';

export type Grouping = 'none' | 'categories';

export interface GroupingSelectorProps {
  grouping: Grouping;
  onChangeGrouping: (grouping: Grouping) => void;
}

export const GroupingSelector: React.FC<GroupingSelectorProps> = ({
  grouping,
  onChangeGrouping,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);

  const groupingSelectorButton = useMemo(
    () => (
      <EuiButton
        color="text"
        iconType="arrowDown"
        iconSide="right"
        data-test-subj="logsOverviewGroupingSelector"
        onClick={() => setIsPopoverOpen((prev) => !prev)}
      >
        {grouping === 'none' ? groupingItemEventsTitle : groupingItemCategoriesTitle}
      </EuiButton>
    ),
    [grouping]
  );

  const groupingSelectorItems = useMemo(
    () => [
      <EuiContextMenuItem
        key="none"
        onClick={() => onChangeGrouping('none')}
        data-test-subj="logsOverviewGroupingSelectorNone"
        icon={grouping === 'none' ? 'check' : 'list'}
      >
        {groupingItemEventsTitle}
      </EuiContextMenuItem>,
      <EuiContextMenuItem
        key="categories"
        onClick={() => onChangeGrouping('categories')}
        data-test-subj="logsOverviewGroupingSelectorCategories"
        icon={grouping === 'categories' ? 'check' : 'sparkles'}
      >
        {groupingItemCategoriesTitle}
      </EuiContextMenuItem>,
    ],
    [onChangeGrouping, grouping]
  );

  return (
    <EuiPopover
      button={groupingSelectorButton}
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      anchorPosition="downRight"
    >
      <EuiContextMenuPanel items={groupingSelectorItems} />
    </EuiPopover>
  );
};

const groupingItemEventsTitle = i18n.translate(
  'xpack.observabilityLogsOverview.groupingSelector.events',
  {
    defaultMessage: 'Log Events',
  }
);

const groupingItemCategoriesTitle = i18n.translate(
  'xpack.observabilityLogsOverview.groupingSelector.categories',
  {
    defaultMessage: 'Log Patterns',
  }
);
