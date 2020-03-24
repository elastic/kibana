/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import PropTypes from 'prop-types';
import {
  EuiButtonEmpty,
  EuiContextMenu,
  EuiIcon,
  EuiContextMenuPanelItemDescriptor,
} from '@elastic/eui';
import { CanvasWorkpadBoundingBox } from '../../../../types';
import { MAX_ZOOM_LEVEL, MIN_ZOOM_LEVEL } from '../../../../common/lib';
import { Popover, ClosePopoverFn } from '../../popover';
import { flattenPanelTree } from '../../../lib/flatten_panel_tree';
import { ComponentStrings } from '../../../../i18n/components';
import { getFitZoomScale } from './get_fit_zoom_scale';

const { WorkpadHeaderViewMenu: strings } = ComponentStrings;

const QUICK_ZOOM_LEVELS = [0.5, 1, 2];

export interface Props {
  isWriteable: boolean;
  /**
   * current workpad zoom level
   */
  zoomScale: number;
  /**
   * minimum bounding box for the workpad
   */
  boundingBox: CanvasWorkpadBoundingBox;
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
  /**
   * toggle edit/read only mode
   */
  toggleWriteable: () => void;
  /**
   * enter fullscreen mode
   */
  enterFullscreen: () => void;
  /**
   * triggers a refresh of the workpad
   */
  doRefresh: () => void;
}

export const ViewMenu: FunctionComponent<Props> = ({
  isWriteable,
  zoomScale,
  zoomIn,
  zoomOut,
  resetZoom,
  boundingBox,
  setZoomScale,
  workpadWidth,
  workpadHeight,
  toggleWriteable,
  enterFullscreen,
  doRefresh,
}) => {
  const viewControl = (togglePopover: React.MouseEventHandler<any>) => (
    <EuiButtonEmpty size="xs" aria-label={strings.getViewMenuLabel()} onClick={togglePopover}>
      {strings.getViewMenuButtonLabel()}
    </EuiButtonEmpty>
  );

  const fitToWindow = () => {
    setZoomScale(getFitZoomScale(boundingBox, workpadWidth, workpadHeight));
  };

  const getScaleMenuItems = (): EuiContextMenuPanelItemDescriptor[] =>
    QUICK_ZOOM_LEVELS.map((scale: number) => ({
      name: strings.getZoomPercentage(scale),
      icon: 'empty',
      onClick: () => setZoomScale(scale),
    }));

  const getZoomMenuItems = (): EuiContextMenuPanelItemDescriptor[] => [
    {
      name: strings.getZoomFitToWindowText(),
      icon: 'empty',
      onClick: fitToWindow,
      disabled: zoomScale === MAX_ZOOM_LEVEL,
    },
    ...getScaleMenuItems(),
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

  const getPanelTree = (closePopover: ClosePopoverFn) => ({
    id: 0,
    title: strings.getViewMenuLabel(),
    items: [
      {
        name: strings.getFullscreenMenuItemLabel(),
        icon: <EuiIcon type="fullScreen" size="m" />,
        onClick: () => {
          enterFullscreen();
          closePopover();
        },
      },
      {
        name: isWriteable ? strings.getHideEditModeLabel() : strings.getShowEditModeLabel(),
        icon: <EuiIcon type={isWriteable ? 'eyeClosed' : 'eye'} size="m" />,
        onClick: () => {
          toggleWriteable();
          closePopover();
        },
      },
      {
        name: strings.getRefreshMenuItemLabel(),
        icon: 'refresh',
        onClick: () => {
          doRefresh();
        },
      },
      {
        name: strings.getZoomMenuItemLabel(),
        icon: 'magnifyWithPlus',
        panel: {
          id: 1,
          title: strings.getZoomMenuItemLabel(),
          items: getZoomMenuItems(),
        },
      },
    ],
  });

  return (
    <Popover button={viewControl} panelPaddingSize="none" anchorPosition="downLeft">
      {({ closePopover }: { closePopover: ClosePopoverFn }) => (
        <EuiContextMenu initialPanelId={0} panels={flattenPanelTree(getPanelTree(closePopover))} />
      )}
    </Popover>
  );
};

ViewMenu.propTypes = {
  isWriteable: PropTypes.bool.isRequired,
};
