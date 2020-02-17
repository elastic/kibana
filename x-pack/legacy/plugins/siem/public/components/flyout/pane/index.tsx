/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonIcon, EuiFlyout, EuiFlyoutBody, EuiFlyoutHeader, EuiToolTip } from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import { connect, ConnectedProps } from 'react-redux';
import styled from 'styled-components';
import { Resizable, ResizeCallback } from 're-resizable';
import { throttle } from 'lodash/fp';

import { TimelineResizeHandle } from './timeline_resize_handle';
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

const EuiFlyoutContainer = styled.div<{ headerHeight: number }>`
  .timeline-flyout {
    min-width: 150px;
    width: auto;
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

const FlyoutHeaderContainer = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  width: 100%;
`;

// manually wrap the close button because EuiButtonIcon can't be a wrapped `styled`
const WrappedCloseButton = styled.div`
  margin-right: 5px;
`;

const FlyoutHeaderWithCloseButtonComponent: React.FC<{
  onClose: () => void;
  timelineId: string;
  usersViewing: string[];
}> = ({ onClose, timelineId, usersViewing }) => (
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
);

const FlyoutHeaderWithCloseButton = React.memo(
  FlyoutHeaderWithCloseButtonComponent,
  (prevProps, nextProps) =>
    prevProps.timelineId === nextProps.timelineId &&
    prevProps.usersViewing === nextProps.usersViewing
);

const FlyoutPaneComponent: React.FC<Props> = ({
  applyDeltaToWidth,
  children,
  flyoutHeight,
  headerHeight,
  onClose,
  timelineId,
  usersViewing,
  width,
}) => {
  const [lastDelta, setLastDelta] = useState(0);
  const onResizeStop: ResizeCallback = useCallback(
    (e, direction, ref, delta) => {
      const bodyClientWidthPixels = document.body.clientWidth;

      if (delta.width) {
        applyDeltaToWidth({
          bodyClientWidthPixels,
          delta: -(delta.width - lastDelta),
          id: timelineId,
          maxWidthPercent,
          minWidthPixels,
        });
        setLastDelta(delta.width);
      }
    },
    [applyDeltaToWidth, maxWidthPercent, minWidthPixels, lastDelta]
  );
  const resetLastDelta = useCallback(() => setLastDelta(0), [setLastDelta]);
  const throttledResize = throttle(100, onResizeStop);

  return (
    <EuiFlyoutContainer headerHeight={headerHeight} data-test-subj="flyout-pane">
      <EuiFlyout
        aria-label={i18n.TIMELINE_DESCRIPTION}
        className="timeline-flyout"
        data-test-subj="eui-flyout"
        hideCloseButton={true}
        onClose={onClose}
        size="l"
      >
        <Resizable
          enable={{ left: true }}
          defaultSize={{
            width,
            height: 'auto',
          }}
          minWidth={minWidthPixels}
          maxWidth={`${maxWidthPercent}vw`}
          handleComponent={{
            left: (
              <TimelineResizeHandle data-test-subj="flyout-resize-handle" height={flyoutHeight} />
            ),
          }}
          onResizeStart={resetLastDelta}
          onResize={throttledResize}
        >
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
        </Resizable>
      </EuiFlyout>
    </EuiFlyoutContainer>
  );
};

const mapDispatchToProps = {
  applyDeltaToWidth: timelineActions.applyDeltaToWidth,
};

const connector = connect(null, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const Pane = connector(React.memo(FlyoutPaneComponent));

Pane.displayName = 'Pane';
