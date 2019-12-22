/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonIcon, EuiFlyout, EuiFlyoutBody, EuiFlyoutHeader, EuiToolTip } from '@elastic/eui';
import React, { useCallback } from 'react';
import { connect, ConnectedProps } from 'react-redux';
import styled from 'styled-components';

import { OnResize, Resizeable } from '../../resize_handle';
import { TimelineResizeHandle } from '../../resize_handle/styled_handles';
import { FlyoutHeader } from '../header';

import * as i18n from './translations';
import { timelineActions } from '../../../store/actions';

const minWidthPixels = 550; // do not allow the flyout to shrink below this width (pixels)
const maxWidthPercent = 95; // do not allow the flyout to grow past this percentage of the view
interface OwnProps {
  children: React.ReactNode;
  flyoutHeight: number;
  headerHeight: number;
  onClose: () => void;
  timelineId: string;
  usersViewing: string[];
  width: number;
}

type Props = OwnProps & PropsFromRedux;

const EuiFlyoutContainer = styled.div<{ headerHeight: number; width: number }>`
  .timeline-flyout {
    min-width: 150px;
    width: ${({ width }) => `${width}px`};
  }
  .timeline-flyout-header {
    align-items: center;
    box-shadow: none;
    display: flex;
    flex-direction: row;
    height: ${({ headerHeight }) => `${headerHeight}px`};
    max-height: ${({ headerHeight }) => `${headerHeight}px`};
    overflow: hidden;
    padding: 5px 0 0 10px;
  }
  .timeline-flyout-body {
    overflow-y: hidden;
    padding: 0;
    .euiFlyoutBody__overflow {
      padding: 0;
    }
  }
`;

EuiFlyoutContainer.displayName = 'EuiFlyoutContainer';

const FlyoutHeaderContainer = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  width: 100%;
`;

FlyoutHeaderContainer.displayName = 'FlyoutHeaderContainer';

// manually wrap the close button because EuiButtonIcon can't be a wrapped `styled`
const WrappedCloseButton = styled.div`
  margin-right: 5px;
`;

WrappedCloseButton.displayName = 'WrappedCloseButton';

const FlyoutHeaderWithCloseButton = React.memo<{
  onClose: () => void;
  timelineId: string;
  usersViewing: string[];
}>(
  ({ onClose, timelineId, usersViewing }) => (
    <FlyoutHeaderContainer>
      <WrappedCloseButton>
        <EuiToolTip content={i18n.CLOSE_TIMELINE}>
          <EuiButtonIcon
            aria-label={i18n.CLOSE_TIMELINE}
            data-test-subj="close-timeline"
            iconType="cross"
            onClick={onClose}
          />
        </EuiToolTip>
      </WrappedCloseButton>
      <FlyoutHeader timelineId={timelineId} usersViewing={usersViewing} />
    </FlyoutHeaderContainer>
  ),
  (prevProps, nextProps) =>
    prevProps.timelineId === nextProps.timelineId &&
    prevProps.usersViewing === nextProps.usersViewing
);

FlyoutHeaderWithCloseButton.displayName = 'FlyoutHeaderWithCloseButton';

const FlyoutPaneComponent = React.memo<Props>(
  ({
    applyDeltaToWidth,
    children,
    flyoutHeight,
    headerHeight,
    onClose,
    timelineId,
    usersViewing,
    width,
  }) => {
    const renderFlyout = useCallback(() => <></>, []);

    const onResize: OnResize = useCallback(
      ({ delta, id }) => {
        const bodyClientWidthPixels = document.body.clientWidth;

        applyDeltaToWidth({
          bodyClientWidthPixels,
          delta,
          id,
          maxWidthPercent,
          minWidthPixels,
        });
      },
      [applyDeltaToWidth, maxWidthPercent, minWidthPixels]
    );
    return (
      <EuiFlyoutContainer headerHeight={headerHeight} data-test-subj="flyout-pane" width={width}>
        <EuiFlyout
          aria-label={i18n.TIMELINE_DESCRIPTION}
          className="timeline-flyout"
          data-test-subj="eui-flyout"
          hideCloseButton={true}
          maxWidth={`${maxWidthPercent}%`}
          onClose={onClose}
          size="l"
        >
          <Resizeable
            handle={
              <TimelineResizeHandle data-test-subj="flyout-resize-handle" height={flyoutHeight} />
            }
            id={timelineId}
            onResize={onResize}
            render={renderFlyout}
          />
          <EuiFlyoutHeader
            className="timeline-flyout-header"
            data-test-subj="eui-flyout-header"
            hasBorder={false}
          >
            <FlyoutHeaderWithCloseButton
              onClose={onClose}
              timelineId={timelineId}
              usersViewing={usersViewing}
            />
          </EuiFlyoutHeader>
          <EuiFlyoutBody data-test-subj="eui-flyout-body" className="timeline-flyout-body">
            {children}
          </EuiFlyoutBody>
        </EuiFlyout>
      </EuiFlyoutContainer>
    );
  }
);

FlyoutPaneComponent.displayName = 'FlyoutPaneComponent';

const connector = connect(null, {
  applyDeltaToWidth: timelineActions.applyDeltaToWidth,
});

type PropsFromRedux = ConnectedProps<typeof connector>;

export const Pane = connector(FlyoutPaneComponent);

Pane.displayName = 'Pane';
