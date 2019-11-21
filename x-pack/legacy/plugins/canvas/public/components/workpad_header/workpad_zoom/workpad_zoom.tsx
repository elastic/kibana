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
// @ts-ignore untyped local
import { Popover } from '../../popover';
import {
  MAX_ZOOM_LEVEL,
  MIN_ZOOM_LEVEL,
  WORKPAD_CANVAS_BUFFER,
  CANVAS_LAYOUT_STAGE_CONTENT_SELECTOR,
} from '../../../../common/lib/constants';

import { ComponentStrings } from '../../../../i18n';
const { WorkpadHeaderWorkpadZoom: strings } = ComponentStrings;

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
   * width of the workpad page
   */
  workpadWidth: number;
  /**
   * height of the workpad page
   */
  workpadHeight: number;
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
    workpadWidth: PropTypes.number.isRequired,
    workpadHeight: PropTypes.number.isRequired,
  };

  _fitToWindow = () => {
    const { boundingBox, setZoomScale, workpadWidth, workpadHeight } = this.props;
    const canvasLayoutContent = document.querySelector(
      `#${CANVAS_LAYOUT_STAGE_CONTENT_SELECTOR}`
    ) as HTMLElement;
    const layoutWidth = canvasLayoutContent.clientWidth;
    const layoutHeight = canvasLayoutContent.clientHeight;
    const offsetLeft = boundingBox.left;
    const offsetTop = boundingBox.top;
    const offsetRight = boundingBox.right - workpadWidth;
    const offsetBottom = boundingBox.bottom - workpadHeight;
    const boundingWidth =
      workpadWidth +
      Math.max(Math.abs(offsetLeft), Math.abs(offsetRight)) * 2 +
      WORKPAD_CANVAS_BUFFER;
    const boundingHeight =
      workpadHeight +
      Math.max(Math.abs(offsetTop), Math.abs(offsetBottom)) * 2 +
      WORKPAD_CANVAS_BUFFER;
    const xScale = layoutWidth / boundingWidth;
    const yScale = layoutHeight / boundingHeight;

    setZoomScale(Math.min(xScale, yScale));
  };

  _button = (togglePopover: MouseEventHandler<HTMLButtonElement>) => (
    <EuiButtonIcon
      iconType="magnifyWithPlus"
      aria-label={strings.getZoomControlsAriaLabel()}
      onClick={togglePopover}
    />
  );

  _getScaleMenuItems = (): EuiContextMenuPanelItemDescriptor[] =>
    QUICK_ZOOM_LEVELS.map(scale => ({
      name: strings.getZoomPercentage(scale),
      icon: 'empty',
      onClick: () => this.props.setZoomScale(scale),
    }));

  _getPanels = (): EuiContextMenuPanelDescriptor[] => {
    const { zoomScale, zoomIn, zoomOut, resetZoom } = this.props;
    const items: EuiContextMenuPanelItemDescriptor[] = [
      {
        name: strings.getZoomFitToWindowText(),
        icon: 'empty',
        onClick: this._fitToWindow,
        disabled: zoomScale === MAX_ZOOM_LEVEL,
      },
      ...this._getScaleMenuItems(),
      {
        name: strings.getZoomInText(),
        icon: 'magnifyWithPlus',
        onClick: zoomIn,
        disabled: zoomScale === MAX_ZOOM_LEVEL,
        className: 'canvasContextMenu--topBorder',
      },
      {
        name: strings.getZoomOutText(),
        icon: 'magnifyWithMinus',
        onClick: zoomOut,
        disabled: zoomScale <= MIN_ZOOM_LEVEL,
      },
      {
        name: strings.getZoomResetText(),
        icon: 'empty',
        onClick: resetZoom,
        disabled: zoomScale >= MAX_ZOOM_LEVEL,
        className: 'canvasContextMenu--topBorder',
      },
    ];

    const panels: EuiContextMenuPanelDescriptor[] = [
      {
        id: 0,
        title: strings.getZoomPanelTitle(),
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
        tooltip={strings.getZoomControlsTooltip()}
        tooltipPosition="bottom"
      >
        {() => <EuiContextMenu initialPanelId={0} panels={this._getPanels()} />}
      </Popover>
    );
  }
}
