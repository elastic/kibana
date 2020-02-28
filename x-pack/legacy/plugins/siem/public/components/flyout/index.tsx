/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge } from '@elastic/eui';
import { defaultTo, getOr } from 'lodash/fp';
import React, { useCallback } from 'react';
import { connect, ConnectedProps } from 'react-redux';
import styled from 'styled-components';
import deepEqual from 'fast-deep-equal';

import { State, timelineSelectors } from '../../store';
import { DataProvider } from '../timeline/data_providers/data_provider';
import { FlyoutButton } from './button';
import { Pane } from './pane';
import { timelineActions } from '../../store/actions';
import { DEFAULT_TIMELINE_WIDTH } from '../timeline/body/constants';

/** The height in pixels of the flyout header, exported for use in height calculations */
export const flyoutHeaderHeight: number = 60;

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

interface OwnProps {
  children?: React.ReactNode;
  flyoutHeight: number;
  headerHeight: number;
  timelineId: string;
  usersViewing: string[];
}

type Props = OwnProps & ProsFromRedux;

export const FlyoutComponent = React.memo<Props>(
  ({
    children,
    dataProviders,
    flyoutHeight,
    headerHeight,
    show,
    showTimeline,
    timelineId,
    usersViewing,
    width,
  }) => {
    const handleClose = useCallback(() => showTimeline({ id: timelineId, show: false }), [
      showTimeline,
      timelineId,
    ]);
    const handleOpen = useCallback(() => showTimeline({ id: timelineId, show: true }), [
      showTimeline,
      timelineId,
    ]);

    return (
      <>
        <Visible show={show}>
          <Pane
            flyoutHeight={flyoutHeight}
            headerHeight={headerHeight}
            onClose={handleClose}
            timelineId={timelineId}
            usersViewing={usersViewing}
            width={width}
          >
            {children}
          </Pane>
        </Visible>
        <FlyoutButton
          dataProviders={dataProviders!}
          show={!show}
          timelineId={timelineId}
          onOpen={handleOpen}
        />
      </>
    );
  },
  (prevProps, nextProps) =>
    prevProps.children === nextProps.children &&
    deepEqual(prevProps.dataProviders, nextProps.dataProviders) &&
    prevProps.flyoutHeight === nextProps.flyoutHeight &&
    prevProps.headerHeight === nextProps.headerHeight &&
    prevProps.show === nextProps.show &&
    prevProps.showTimeline === nextProps.showTimeline &&
    prevProps.timelineId === nextProps.timelineId &&
    prevProps.usersViewing === nextProps.usersViewing &&
    prevProps.width === nextProps.width
);

FlyoutComponent.displayName = 'FlyoutComponent';

const mapStateToProps = (state: State, { timelineId }: OwnProps) => {
  const timelineById = defaultTo({}, timelineSelectors.timelineByIdSelector(state));
  const dataProviders = getOr([], `${timelineId}.dataProviders`, timelineById) as DataProvider[];
  const show = getOr(false, `${timelineId}.show`, timelineById) as boolean;
  const width = getOr(DEFAULT_TIMELINE_WIDTH, `${timelineId}.width`, timelineById) as number;

  return { dataProviders, show, width };
};

const mapDispatchToProps = {
  showTimeline: timelineActions.showTimeline,
};

const connector = connect(mapStateToProps, mapDispatchToProps);

type ProsFromRedux = ConnectedProps<typeof connector>;

export const Flyout = connector(FlyoutComponent);

Flyout.displayName = 'Flyout';
