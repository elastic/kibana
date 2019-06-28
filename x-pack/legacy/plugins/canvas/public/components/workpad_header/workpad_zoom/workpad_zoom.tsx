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
import {
  MAX_ZOOM_LEVEL,
  MIN_ZOOM_LEVEL,
  WORKPAD_CANVAS_BUFFER,
  CANVAS_LAYOUT_STAGE_CONTENT_SELECTOR,
} from '../../../../common/lib/constants';

export interface Props {
  /**
   * current workpad zoom level
   */
  zoomScale: number;
  /**
   * minimum bounding box for the workpad
   */
  boundingBox: { left: number; right: number; top: number; bottom: number };
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
  /**
   * reset zoom to 100%
   */
  resetZoom: () => void;
}

const QUICK_ZOOM_LEVELS = [0.5, 1, 2];

export class WorkpadZoom extends PureComponent<Props> {
  static propTypes = {
    zoomScale: PropTypes.number.isRequired,
    setZoomScale: PropTypes.func.isRequired,
    zoomIn: PropTypes.func.isRequired,
    zoomOut: PropTypes.func.isRequired,
    resetZoom: PropTypes.func.isRequired,
    boundingBox: PropTypes.shape({
      left: PropTypes.number.isRequired,
      right: PropTypes.number.isRequired,
      top: PropTypes.number.isRequired,
      bottom: PropTypes.number.isRequired,
    }),
  };

  _fitToWindow = () => {
    const { boundingBox, setZoomScale } = this.props;
    const canvasLayoutContent = document.querySelector(
      `#${CANVAS_LAYOUT_STAGE_CONTENT_SELECTOR}`
    ) as HTMLElement;
    const layoutWidth = canvasLayoutContent.clientWidth;
    const layoutHeight = canvasLayoutContent.clientHeight;
    const boundingWidth =
      Math.max(layoutWidth, boundingBox.right) -
      Math.min(0, boundingBox.left) +
      WORKPAD_CANVAS_BUFFER * 2;
    const boundingHeight =
      Math.max(layoutHeight, boundingBox.bottom) -
      Math.min(0, boundingBox.top) +
      WORKPAD_CANVAS_BUFFER * 2;
    const xScale = layoutWidth / boundingWidth;
    const yScale = layoutHeight / boundingHeight;

    setZoomScale(Math.min(xScale, yScale));
  };

  _button = (togglePopover: MouseEventHandler<HTMLButtonElement>) => (
    <EuiButtonIcon
      iconType="magnifyWithPlus"
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
    const { zoomScale, zoomIn, zoomOut, resetZoom } = this.props;
    const items: EuiContextMenuPanelItemDescriptor[] = [
      {
        name: 'Fit to window',
        icon: 'empty',
        onClick: this._fitToWindow,
        disabled: zoomScale === MAX_ZOOM_LEVEL,
      },
      ...this._getScaleMenuItems(),
      {
        name: 'Zoom in',
        icon: 'magnifyWithPlus',
        onClick: zoomIn,
        disabled: zoomScale === MAX_ZOOM_LEVEL,
        className: 'canvasContextMenu--topBorder',
      },
      {
        name: 'Zoom out',
        icon: 'magnifyWithMinus',
        onClick: zoomOut,
        disabled: zoomScale <= MIN_ZOOM_LEVEL,
      },
      {
        name: 'Reset',
        icon: 'empty',
        onClick: resetZoom,
        disabled: zoomScale >= MAX_ZOOM_LEVEL,
        className: 'canvasContextMenu--topBorder',
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
