/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { calculatePopoverPosition, EuiPortal } from '@elastic/eui';
import * as React from 'react';

import { AutoSizer } from '../../auto_sizer';

interface SearchMarkerTooltipProps {
  markerPosition: ClientRect;
}

export class SearchMarkerTooltip extends React.PureComponent<SearchMarkerTooltipProps, {}> {
  public render() {
    const { children, markerPosition } = this.props;

    return (
      <EuiPortal>
        <div style={{ position: 'relative' }}>
          <AutoSizer content={false} bounds>
            {({ measureRef, bounds: { width, height } }) => {
              const { top, left } =
                width && height
                  ? calculatePopoverPosition(markerPosition, { width, height }, 'left', 16, [
                      'left',
                    ])
                  : {
                      left: -9999, // render off-screen before the first measurement
                      top: 0,
                    };

              return (
                <div
                  className="euiToolTip euiToolTip--left euiToolTipPopover"
                  style={{
                    left,
                    top,
                  }}
                  ref={measureRef}
                >
                  {children}
                </div>
              );
            }}
          </AutoSizer>
        </div>
      </EuiPortal>
    );
  }
}
