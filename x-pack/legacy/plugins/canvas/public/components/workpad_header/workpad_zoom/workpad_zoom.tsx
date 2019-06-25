/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { MouseEventHandler, PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
  EuiButtonIcon,
  EuiContextMenu,
  EuiContextMenuPanelDescriptor,
  EuiContextMenuPanelItemDescriptor,
} from '@elastic/eui';
// @ts-ignore unconverted local component
import { Popover } from '../../popover';
import { MAX_ZOOM_LEVEL, MIN_ZOOM_LEVEL } from '../../../../common/lib/constants';

export interface Props {
  /**
   * current workpad zoom level
   */
  zoomScale: number;
  /**
   * handler to set the workpad zoom level to a specific value
   */
  setZoomScale: (scale: number) => void;
  /**
   * handler to increase the workpad zoom level
   */
  zoomIn: () => void;
  /**
   * handler to decrease workpad zoom level
   */
  zoomOut: () => void;
}

const QUICK_ZOOM_LEVELS = [0.5, 1, 2];

export class WorkpadZoom extends PureComponent<Props> {
  static propTypes = {
    zoomScale: PropTypes.number.isRequired,
    setZoomScale: PropTypes.func.isRequired,
    zoomIn: PropTypes.func.isRequired,
    zoomOut: PropTypes.func.isRequired,
  };

  _button = (togglePopover: MouseEventHandler<HTMLButtonElement>) => (
    <EuiButtonIcon
      iconType="starPlusFilled" // TODO: change this to magnifyWithPlus when available
      aria-label="Share this workpad"
      onClick={togglePopover}
    />
  );

  _getPrettyZoomLevel = (scale: number) => `${scale * 100}%`;

  _getScaleMenuItems = (): EuiContextMenuPanelItemDescriptor[] =>
    QUICK_ZOOM_LEVELS.map(scale => ({
      name: this._getPrettyZoomLevel(scale),
      icon: 'empty',
      onClick: () => this.props.setZoomScale(scale),
    }));

  _getPanels = (): EuiContextMenuPanelDescriptor[] => {
    const { zoomScale, zoomIn, zoomOut } = this.props;
    const items: EuiContextMenuPanelItemDescriptor[] = [
      ...this._getScaleMenuItems(),
      {
        name: 'Zoom in',
        icon: 'starPlusFilled', // TODO: change this to magnifyWithPlus when available
        onClick: zoomIn,
        disabled: zoomScale === MAX_ZOOM_LEVEL,
        className: 'canvasContextMenu--topBorder',
      },
      {
        name: 'Zoom out',
        icon: 'starMinusFilled', // TODO: change this to magnifyWithMinus when available
        onClick: zoomOut,
        disabled: zoomScale === MIN_ZOOM_LEVEL,
      },
    ];

    const panels: EuiContextMenuPanelDescriptor[] = [
      {
        id: 0,
        title: `Zoom`,
        items,
      },
    ];

    return panels;
  };

  render() {
    return (
      <Popover
        button={this._button}
        panelPaddingSize="none"
        tooltip="Zoom"
        tooltipPosition="bottom"
      >
        {() => <EuiContextMenu initialPanelId={0} panels={this._getPanels()} />}
      </Popover>
    );
  }
}
