/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge } from '@elastic/eui';
import { defaultTo, getOr } from 'lodash/fp';
import React from 'react';
import { connect, ConnectedProps } from 'react-redux';
import styled from 'styled-components';

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
  }) => (
    <>
      <Visible show={show}>
        <Pane
          flyoutHeight={flyoutHeight}
          headerHeight={headerHeight}
          onClose={() => showTimeline({ id: timelineId, show: false })}
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
        onOpen={() => showTimeline({ id: timelineId, show: true })}
      />
    </>
  )
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
