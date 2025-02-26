/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import PropTypes from 'prop-types';
import type { EuiContextMenuPanelItemDescriptor } from '@elastic/eui';
import { EuiButtonEmpty, EuiContextMenu, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ClosePopoverFn } from '../../popover';
import { Popover } from '../../popover';
import {
  MAX_ZOOM_LEVEL,
  MIN_ZOOM_LEVEL,
  CONTEXT_MENU_TOP_BORDER_CLASSNAME,
} from '../../../../common/lib/constants';

import { flattenPanelTree } from '../../../lib/flatten_panel_tree';
import { AutoRefreshControls } from './auto_refresh_controls';
import { KioskControls } from './kiosk_controls';

const strings = {
  getAutoplaySettingsMenuItemLabel: () =>
    i18n.translate('xpack.canvas.workpadHeaderViewMenu.autoplaySettingsMenuItemLabel', {
      defaultMessage: 'Autoplay settings',
    }),
  getFullscreenMenuItemLabel: () =>
    i18n.translate('xpack.canvas.workpadHeaderViewMenu.fullscreenMenuLabel', {
      defaultMessage: 'Enter fullscreen mode',
    }),
  getHideEditModeLabel: () =>
    i18n.translate('xpack.canvas.workpadHeaderViewMenu.hideEditModeLabel', {
      defaultMessage: 'Hide editing controls',
    }),
  getRefreshMenuItemLabel: () =>
    i18n.translate('xpack.canvas.workpadHeaderViewMenu.refreshMenuItemLabel', {
      defaultMessage: 'Refresh data',
    }),
  getRefreshSettingsMenuItemLabel: () =>
    i18n.translate('xpack.canvas.workpadHeaderViewMenu.refreshSettingsMenuItemLabel', {
      defaultMessage: 'Auto refresh settings',
    }),
  getShowEditModeLabel: () =>
    i18n.translate('xpack.canvas.workpadHeaderViewMenu.showEditModeLabel', {
      defaultMessage: 'Show editing controls',
    }),
  getViewMenuButtonLabel: () =>
    i18n.translate('xpack.canvas.workpadHeaderViewMenu.viewMenuButtonLabel', {
      defaultMessage: 'View',
    }),
  getViewMenuLabel: () =>
    i18n.translate('xpack.canvas.workpadHeaderViewMenu.viewMenuLabel', {
      defaultMessage: 'View options',
    }),
  getZoomFitToWindowText: () =>
    i18n.translate('xpack.canvas.workpadHeaderViewMenu.zoomFitToWindowText', {
      defaultMessage: 'Fit to window',
    }),
  getZoomInText: () =>
    i18n.translate('xpack.canvas.workpadHeaderViewMenu.zoomInText', {
      defaultMessage: 'Zoom in',
    }),
  getZoomMenuItemLabel: () =>
    i18n.translate('xpack.canvas.workpadHeaderViewMenu.zoomMenuItemLabel', {
      defaultMessage: 'Zoom',
    }),
  getZoomOutText: () =>
    i18n.translate('xpack.canvas.workpadHeaderViewMenu.zoomOutText', {
      defaultMessage: 'Zoom out',
    }),
  getZoomPercentage: (scale: number) =>
    i18n.translate('xpack.canvas.workpadHeaderViewMenu.zoomResetText', {
      defaultMessage: '{scalePercentage}%',
      values: {
        scalePercentage: scale * 100,
      },
    }),
  getZoomResetText: () =>
    i18n.translate('xpack.canvas.workpadHeaderViewMenu.zoomPrecentageValue', {
      defaultMessage: 'Reset',
    }),
};

const QUICK_ZOOM_LEVELS = [0.5, 1, 2];

export interface Props {
  /**
   * Is the workpad edittable?
   */
  isWriteable: boolean;
  /**
   * current workpad zoom level
   */
  zoomScale: number;
  /**
   * zooms to fit entire workpad into view
   */
  fitToWindow: () => void;
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
  /**
   * Current auto refresh interval
   */
  refreshInterval: number;
  /**
   * Sets auto refresh interval
   */
  setRefreshInterval: (interval: number) => void;
  /**
   * Is autoplay enabled?
   */
  autoplayEnabled: boolean;
  /**
   * Current autoplay interval
   */
  autoplayInterval: number;
  /**
   * Sets autoplay interval
   */
  setAutoplayInterval: (interval: number) => void;
}

export const ViewMenu: FunctionComponent<Props> = ({
  enterFullscreen,
  fitToWindow,
  isWriteable,
  resetZoom,
  setZoomScale,
  toggleWriteable,
  zoomIn,
  zoomOut,
  zoomScale,
  doRefresh,
  refreshInterval,
  setRefreshInterval,
  autoplayEnabled,
  autoplayInterval,
  setAutoplayInterval,
}) => {
  const setRefresh = (val: number) => setRefreshInterval(val);

  const disableInterval = () => {
    setRefresh(0);
  };

  const viewControl = (togglePopover: React.MouseEventHandler<any>) => (
    <EuiButtonEmpty size="s" aria-label={strings.getViewMenuLabel()} onClick={togglePopover}>
      {strings.getViewMenuButtonLabel()}
    </EuiButtonEmpty>
  );

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
    items: [
      {
        name: strings.getRefreshMenuItemLabel(),
        icon: 'refresh',
        onClick: () => {
          doRefresh();
        },
      },
      {
        name: strings.getRefreshSettingsMenuItemLabel(),
        icon: 'empty',
        panel: {
          id: 1,
          title: strings.getRefreshSettingsMenuItemLabel(),
          content: (
            <AutoRefreshControls
              refreshInterval={refreshInterval}
              setRefresh={(val) => setRefresh(val)}
              disableInterval={() => disableInterval()}
            />
          ),
        },
      },
      {
        name: strings.getFullscreenMenuItemLabel(),
        icon: <EuiIcon type="fullScreen" size="m" />,
        className: CONTEXT_MENU_TOP_BORDER_CLASSNAME,
        onClick: () => {
          enterFullscreen();
          closePopover();
        },
      },
      {
        name: strings.getAutoplaySettingsMenuItemLabel(),
        icon: 'empty',
        panel: {
          id: 2,
          title: strings.getAutoplaySettingsMenuItemLabel(),
          content: (
            <KioskControls
              autoplayInterval={autoplayInterval}
              onSetInterval={setAutoplayInterval}
            />
          ),
        },
      },
      {
        name: isWriteable ? strings.getHideEditModeLabel() : strings.getShowEditModeLabel(),
        icon: <EuiIcon type={isWriteable ? 'eyeClosed' : 'eye'} size="m" />,
        className: CONTEXT_MENU_TOP_BORDER_CLASSNAME,
        onClick: () => {
          toggleWriteable();
          closePopover();
        },
      },
      {
        name: strings.getZoomMenuItemLabel(),
        icon: 'magnifyWithPlus',
        panel: {
          id: 3,
          title: strings.getZoomMenuItemLabel(),
          items: getZoomMenuItems(),
        },
      },
    ],
  });

  return (
    <Popover button={viewControl} panelPaddingSize="none" anchorPosition="downLeft">
      {({ closePopover }: { closePopover: ClosePopoverFn }) => (
        <EuiContextMenu
          initialPanelId={0}
          panels={flattenPanelTree(getPanelTree(closePopover))}
          className="canvasViewMenu"
        />
      )}
    </Popover>
  );
};

ViewMenu.propTypes = {
  isWriteable: PropTypes.bool.isRequired,
  zoomScale: PropTypes.number.isRequired,
  fitToWindow: PropTypes.func.isRequired,
  setZoomScale: PropTypes.func.isRequired,
  zoomIn: PropTypes.func.isRequired,
  zoomOut: PropTypes.func.isRequired,
  resetZoom: PropTypes.func.isRequired,
  toggleWriteable: PropTypes.func.isRequired,
  enterFullscreen: PropTypes.func.isRequired,
  doRefresh: PropTypes.func.isRequired,
  refreshInterval: PropTypes.number.isRequired,
  setRefreshInterval: PropTypes.func.isRequired,
  autoplayEnabled: PropTypes.bool.isRequired,
  autoplayInterval: PropTypes.number.isRequired,
  setAutoplayInterval: PropTypes.func.isRequired,
};
