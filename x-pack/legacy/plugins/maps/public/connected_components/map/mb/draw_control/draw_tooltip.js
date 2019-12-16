/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { Component } from 'react';
import { EuiPopover, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DRAW_TYPE } from '../../../../../common/constants';

const noop = () => {};

export class DrawTooltip extends Component {
  state = {
    x: undefined,
    y: undefined,
    isOpen: false,
  };

  constructor(props) {
    super(props);
    this._popoverRef = React.createRef();
  }

  componentDidMount() {
    this.props.mbMap.on('mousemove', this._updateTooltipLocation);
    this.props.mbMap.on('mouseout', this._hideTooltip);
  }

  componentDidUpdate() {
    if (this._popoverRef.current) {
      this._popoverRef.current.positionPopoverFluid();
    }
  }

  componentWillUnmount() {
    this.props.mbMap.off('mousemove', this._updateTooltipLocation);
    this.props.mbMap.off('mouseout', this._hideTooltip);
    this._updateTooltipLocation.cancel();
  }

  render() {
    const instructions =
      this.props.drawState.drawType === DRAW_TYPE.BOUNDS
        ? i18n.translate('xpack.maps.drawTooltip.boundsInstructions', {
            defaultMessage: 'Click to start rectangle. Click again to finish.',
          })
        : i18n.translate('xpack.maps.drawTooltip.polygonInstructions', {
            defaultMessage: 'Click to add vertex. Double click to finish.',
          });

    const tooltipAnchor = (
      <div style={{ height: '26px', width: '26px', background: 'transparent' }} />
    );

    return (
      <EuiPopover
        id="drawInstructionsTooltip"
        button={tooltipAnchor}
        anchorPosition="rightCenter"
        isOpen={this.state.isOpen}
        closePopover={noop}
        ref={this._popoverRef}
        style={{
          pointerEvents: 'none',
          transform: `translate(${this.state.x - 13}px, ${this.state.y - 13}px)`,
        }}
      >
        <EuiText color="subdued" size="xs">
          {instructions}
        </EuiText>
      </EuiPopover>
    );
  }

  _hideTooltip = () => {
    this._updateTooltipLocation.cancel();
    this.setState({ isOpen: false });
  };

  _updateTooltipLocation = _.throttle(({ lngLat }) => {
    const mouseLocation = this.props.mbMap.project(lngLat);
    this.setState({
      isOpen: true,
      x: mouseLocation.x,
      y: mouseLocation.y,
    });
  }, 100);
}
