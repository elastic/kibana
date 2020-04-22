/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge } from '@elastic/eui';
import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styled from 'styled-components';

import { State, timelineSelectors } from '../../store';
import { FlyoutButton } from './button';
import { Pane } from './pane';
import { timelineActions } from '../../store/actions';
import { StatefulTimeline } from '../timeline';
import { timelineDefaults } from '../../store/timeline/defaults';
import { useApolloClient } from '../../utils/apollo_context';
import { updateIsLoading } from '../../store/timeline/actions';
import { TimelineModel } from '../../store/timeline/model';

export const Badge = styled(EuiBadge)`
  position: absolute;
  padding-left: 4px;
  padding-right: 4px;
  right: 0%;
  top: 0%;
  border-bottom-left-radius: 5px;
`;

Badge.displayName = 'Badge';

const Visible = styled.div<{ show?: boolean }>`
  visibility: ${({ show }) => (show ? 'visible' : 'hidden')};
`;

Visible.displayName = 'Visible';

interface FlyoutComponentProps {
  flyoutHeight: number;
  timelineId: string;
  usersViewing: string[];
}

export const FlyoutComponent: React.FC<FlyoutComponentProps> = ({
  flyoutHeight,
  timelineId,
  usersViewing,
}) => {
  const apolloClient = useApolloClient();
  const dispatch = useDispatch();

  const getTimeline = timelineSelectors.getTimelineByIdSelector();
  const { dataProviders, show, width } =
    useSelector<State, TimelineModel>(state => getTimeline(state, 'timeline-1')) ??
    timelineDefaults;

  const handleClose = useCallback(
    () => dispatch(timelineActions.showTimeline({ id: timelineId, show: false })),
    [timelineId, dispatch]
  );

  const handleOpen = useCallback(
    () => dispatch(timelineActions.showTimeline({ id: timelineId, show: true })),
    [timelineId, dispatch]
  );

  const dispatchedUpdateIsLoading = useCallback(payload => dispatch(updateIsLoading(payload)), [
    dispatch,
  ]);

  return (
    <>
      <Visible show={show}>
        <Pane
          flyoutHeight={flyoutHeight}
          onClose={handleClose}
          timelineId={timelineId}
          width={width}
        >
          <StatefulTimeline onClose={handleClose} usersViewing={usersViewing} id={timelineId} />
        </Pane>
      </Visible>
      <FlyoutButton
        dataProviders={dataProviders}
        show={!show}
        timelineId={timelineId}
        onOpen={handleOpen}
      />
    </>
  );
};

FlyoutComponent.displayName = 'FlyoutComponent';

export const Flyout = React.memo(FlyoutComponent);

Flyout.displayName = 'Flyout';
