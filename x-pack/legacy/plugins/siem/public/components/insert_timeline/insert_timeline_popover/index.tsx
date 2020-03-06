/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPopover } from '@elastic/eui';
import React from 'react';

import { TimelineModel } from '../../../store/timeline/model';
import { useApolloClient } from '../../../utils/apollo_context';

import { ActionTimelineToShow } from '../types';
import { StatefulInsertTimeline } from '..';

export interface InsertTimelinePopoverProps {
  button: React.ReactElement;
  isOpen: boolean;
  onClose: () => void;
  hideActions?: ActionTimelineToShow[];
  onOpen?: (timeline: TimelineModel) => void;
}

const DEFAULT_SEARCH_RESULTS_PER_PAGE = 100;

export const InsertTimelinePopover = React.memo<InsertTimelinePopoverProps>(
  ({ onClose, button, hideActions = [], isOpen, onOpen }) => {
    const apolloClient = useApolloClient();

    if (!apolloClient) return null;

    return (
      <EuiPopover
        button={button}
        closePopover={onClose}
        data-test-subj="insert-timeline-popover"
        isOpen={isOpen}
      >
        <StatefulInsertTimeline
          apolloClient={apolloClient}
          defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
          hideActions={hideActions}
          onInsertTimeline={onOpen}
        />
      </EuiPopover>
    );
  }
);

InsertTimelinePopover.displayName = 'InsertTimelinePopover';
