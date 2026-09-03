/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../_index.scss';
import React, { Component } from 'react';
import type { UseEuiTheme } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, euiShadow, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Filter } from '@kbn/es-query';
import type { ActionExecutionContext, Action } from '@kbn/ui-actions-plugin/public';
import type { Observable, Subscription } from 'rxjs';
import { ExitFullScreenButton } from '@kbn/shared-ux-button-exit-full-screen';
import { css, Global } from '@emotion/react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { MBMap } from '../mb_map';
import { RightSideControls } from '../right_side_controls';
import { Timeslider } from '../timeslider';
import { ToolbarOverlay } from '../toolbar_overlay';
import { EditLayerPanel } from '../edit_layer_panel';
import { AddLayerPanel } from '../add_layer_panel';
import { getIsDarkMode, getTheme, isScreenshotMode } from '../../kibana_services';
import type { RawValue } from '../../../common/constants';
import { FLYOUT_STATE } from '../../reducers/ui';
import type { MapSettings } from '../../../common/descriptor_types';
import { MapSettingsPanel } from '../map_settings_panel';
import type { RenderToolTipContent } from '../../classes/tooltips/tooltip_property';
import type { ILayer } from '../../classes/layers/layer';

export interface Props {
  addFilters: ((filters: Filter[], actionId: string) => Promise<void>) | null;
  getFilterActions?: () => Promise<Action[]>;
  getActionContext?: () => ActionExecutionContext;
  onSingleValueTrigger?: (actionId: string, key: string, value: RawValue) => Promise<void>;
  cancelAllInFlightRequests: () => void;
  reload: () => void;
  exitFullScreen: () => void;
  flyoutDisplay: FLYOUT_STATE;
  isFullScreen: boolean;
  isTimesliderOpen: boolean;
  indexPatternIds: string[];
  mapInitError: string | null | undefined;
  renderTooltipContent?: RenderToolTipContent;
  settings: MapSettings;
  layerList: ILayer[];
  waitUntilTimeLayersLoad$: Observable<void>;
  euiTheme?: any;
}

interface State {
  showFitToBoundsButton: boolean;
  showTimesliderButton: boolean;
}

const mapWrapperStyles = css({ position: 'relative' });

// SVG paths for the zoom in/out controls, based off of the EUI glyphs magnifyPlus and
// magnifyMinus. Rendered as a background-image so the fill color can be applied reactively.
const ZOOM_IN_ICON_PATH =
  'M6 5H8V6H6V8H5V6H3V5H5V3H6V5Z M5.5 0C8.53757 0 11 2.46243 11 5.5C11 6.52601 10.7177 7.48557 10.2285 8.30762L13.6504 11.2412C13.8618 11.4224 13.9883 11.6837 13.999 11.9619C14.0096 12.2402 13.9039 12.5101 13.707 12.707L12.707 13.707C12.5101 13.9039 12.2402 14.0096 11.9619 13.999C11.6837 13.9883 11.4224 13.8618 11.2412 13.6504L8.30762 10.2285C7.48557 10.7177 6.52601 11 5.5 11C2.46243 11 0 8.53757 0 5.5C0 2.46243 2.46243 0 5.5 0ZM9.63867 9.11914C9.47715 9.3037 9.3037 9.47715 9.11914 9.63867L12 13L13 12L9.63867 9.11914ZM5.5 1C3.09234 1 1.12632 2.89083 1.00586 5.26855C1.00198 5.34521 1 5.42238 1 5.5C1 5.57762 1.00198 5.65479 1.00586 5.73145C1.12632 8.10917 3.09234 10 5.5 10C5.60575 10 5.71052 9.99448 5.81445 9.9873C5.83764 9.9857 5.8607 9.9834 5.88379 9.98145C6.09063 9.96397 6.29329 9.93318 6.49121 9.88867C6.51312 9.88373 6.53486 9.8783 6.55664 9.87305C6.75836 9.82448 6.95442 9.76222 7.14453 9.6875C7.15748 9.6824 7.17071 9.67806 7.18359 9.67285C7.37845 9.59416 7.5659 9.50153 7.74609 9.39746C7.75606 9.3917 7.76645 9.38669 7.77637 9.38086C8.43846 8.99166 8.99166 8.43846 9.38086 7.77637C9.38669 7.76645 9.3917 7.75606 9.39746 7.74609C9.50153 7.5659 9.59416 7.37845 9.67285 7.18359C9.67926 7.16774 9.68517 7.15169 9.69141 7.13574C9.76456 6.94842 9.82524 6.75519 9.87305 6.55664C9.8783 6.53486 9.88373 6.51312 9.88867 6.49121C9.93333 6.29265 9.96498 6.08937 9.98242 5.88184C9.98431 5.85942 9.98575 5.83696 9.9873 5.81445C9.99448 5.71052 10 5.60575 10 5.5C10 5.42238 9.99802 5.34521 9.99414 5.26855C9.87368 2.89083 7.90766 1 5.5 1Z';
const ZOOM_OUT_ICON_PATH =
  'M8 6H3V5H8V6Z M5.5 0C8.53757 0 11 2.46243 11 5.5C11 6.52601 10.7177 7.48557 10.2285 8.30762L13.6504 11.2412C13.8618 11.4224 13.9883 11.6837 13.999 11.9619C14.0096 12.2402 13.9039 12.5101 13.707 12.707L12.707 13.707C12.5101 13.9039 12.2402 14.0096 11.9619 13.999C11.6837 13.9883 11.4224 13.8618 11.2412 13.6504L8.30762 10.2285C7.48557 10.7177 6.52601 11 5.5 11C2.46243 11 0 8.53757 0 5.5C0 2.46243 2.46243 0 5.5 0ZM9.63867 9.11914C9.47715 9.3037 9.3037 9.47715 9.11914 9.63867L12 13L13 12L9.63867 9.11914ZM5.5 1C3.09234 1 1.12632 2.89083 1.00586 5.26855C1.00198 5.34521 1 5.42238 1 5.5C1 5.57762 1.00198 5.65479 1.00586 5.73145C1.12632 8.10917 3.09234 10 5.5 10C5.60575 10 5.71052 9.99448 5.81445 9.9873C5.83764 9.9857 5.8607 9.9834 5.88379 9.98145C6.09063 9.96397 6.29329 9.93318 6.49121 9.88867C6.51312 9.88373 6.53486 9.8783 6.55664 9.87305C6.75836 9.82448 6.95442 9.76222 7.14453 9.6875C7.15748 9.6824 7.17071 9.67806 7.18359 9.67285C7.37845 9.59416 7.5659 9.50153 7.74609 9.39746C7.75606 9.3917 7.76645 9.38669 7.77637 9.38086C8.43846 8.99166 8.99166 8.43846 9.38086 7.77637C9.38669 7.76645 9.3917 7.75606 9.39746 7.74609C9.50153 7.5659 9.59416 7.37845 9.67285 7.18359C9.67926 7.16774 9.68517 7.15169 9.69141 7.13574C9.76456 6.94842 9.82524 6.75519 9.87305 6.55664C9.8783 6.53486 9.88373 6.51312 9.88867 6.49121C9.93333 6.29265 9.96498 6.08937 9.98242 5.88184C9.98431 5.85942 9.98575 5.83696 9.9873 5.81445C9.99448 5.71052 10 5.60575 10 5.5C10 5.42238 9.99802 5.34521 9.99414 5.26855C9.87368 2.89083 7.90766 1 5.5 1Z';

const zoomIconBackgroundImage = (path: string, color: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg width='14px' height='14px' viewBox='0 0 14 14' version='1.1' xmlns='http://www.w3.org/2000/svg'><path fill='${color}' d='${path}' /></svg>`
  )}") !important`;

/**
 * Applies theme-dependent colors to the imperatively-rendered MapLibre navigation control (zoom
 * buttons). These controls live outside React, so they are styled through a Global stylesheet that
 * reads the color mode via `useEuiTheme`, allowing them to follow reload-less light/dark switches.
 */
function MapControlsThemeStyles() {
  const euiThemeContext = useEuiTheme();
  const { euiTheme } = euiThemeContext;
  const iconColor = euiTheme.colors.textParagraph;
  return (
    <Global
      styles={[
        // Match the MapLibre zoom control shadow to the medium shadow EUI panels
        // use (via `euiShadow`) so it stays consistent with the toolbar controls
        // and gets the correct light/dark output, including the dark-mode border.
        css`
          .mapContainer .maplibregl-ctrl-group:not(:empty) {
            ${euiShadow(euiThemeContext, 'm')}
          }
        `,
        css({
          '.mapContainer': {
            '.maplibregl-ctrl-group:not(:empty)': {
              backgroundColor: euiTheme.colors.backgroundBasePlain,
            },
            '.maplibregl-ctrl-group:not(:empty):hover': {
              transform: 'translateY(0px) !important',
            },
            '.maplibregl-ctrl-zoom-in .maplibregl-ctrl-icon': {
              backgroundImage: zoomIconBackgroundImage(ZOOM_IN_ICON_PATH, iconColor),
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
            },
            '.maplibregl-ctrl-zoom-out .maplibregl-ctrl-icon': {
              backgroundImage: zoomIconBackgroundImage(ZOOM_OUT_ICON_PATH, iconColor),
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
            },
            '.maplibregl-ctrl button:not(:disabled)': {
              margin: '4px !important',
              height: '24px !important',
              width: '24px !important',
              borderRadius: '2px !important',
            },
            '.maplibregl-ctrl button:not(:disabled):hover::before': {
              backgroundColor: `${euiTheme.colors.backgroundBaseInteractiveHover} !important`,
            },
          },
          '.mapToolbarOverlay__button': {
            transform: 'translateY(0px) !important',
          },
          '.mapToolbarOverlay__button:hover::before': {
            backgroundColor: `${euiTheme.colors.backgroundBaseInteractiveHover} !important`,
          },
          // The layer table-of-contents entries live in the right-side overlay
          // (a sibling of `.mapContainer`), so their divider and state background
          // colors are themed here to react to reload-less light/dark switches.
          '.mapWidgetOverlay .mapTocEntry': {
            borderBottomColor: euiTheme.border.color,
          },
          '.mapWidgetOverlay .mapTocEntry-isSelected': {
            backgroundColor: euiTheme.colors.backgroundBaseSubdued,
          },
          '.mapWidgetOverlay .mapTocEntry-isDraggingOver': {
            backgroundColor: euiTheme.colors.backgroundBasePlain,
          },
          '.mapWidgetOverlay .mapTocEntry-isCombineLayer': {
            backgroundColor: euiTheme.colors.backgroundBaseSuccess,
          },
          '.mapWidgetOverlay .mapTocEntry-isInEditingMode': {
            backgroundColor: `${euiTheme.colors.backgroundBasePrimary} !important`,
          },
          '.mapWidgetOverlay .mapLayerControl': {
            borderTopColor: euiTheme.border.color,
          },
          '.mapWidgetOverlay .mapLayerControl__addLayerButton.euiButton-isDisabled': {
            backgroundColor: `${euiTheme.colors.lightShade} !important`,
          },
          '.mapWidgetOverlay .mapLayerToc-droppable-isCombining': {
            backgroundColor: `${euiTheme.colors.backgroundBasePlain} !important`,
          },
          '.mapWidgetOverlay .mapTocEntry__detailsToggleButton': {
            backgroundColor: euiTheme.colors.backgroundBasePlain,
            borderColor: euiTheme.border.color,
            color: euiTheme.colors.textParagraph,
          },
        }),
      ]}
    />
  );
}

export class MapContainer extends Component<Props, State> {
  private _isMounted: boolean = false;
  private _prevIsDarkMode: boolean = getIsDarkMode();
  private _themeSubscription?: Subscription;

  state: State = {
    showFitToBoundsButton: false,
    showTimesliderButton: false,
  };

  componentDidMount() {
    this._isMounted = true;
    this._loadShowFitToBoundsButton();
    this._loadShowTimesliderButton();
    // Re-sync layers when the color mode changes so theme-dependent layers,
    // such as the EMS basemap, re-fetch their light/dark styling. Layers whose
    // data does not depend on the color mode are skipped via '_canSkipSync'.
    this._themeSubscription = getTheme().theme$.subscribe(({ darkMode }) => {
      if (darkMode === this._prevIsDarkMode) {
        return;
      }
      this._prevIsDarkMode = darkMode;
      this.props.reload();
    });
  }

  componentDidUpdate() {
    this._loadShowFitToBoundsButton();
    this._loadShowTimesliderButton();
  }

  componentWillUnmount() {
    this._isMounted = false;
    this._themeSubscription?.unsubscribe();
    this.props.cancelAllInFlightRequests();
  }

  async _loadShowFitToBoundsButton() {
    const promises = this.props.layerList.map(async (layer) => {
      return await layer.isFittable();
    });
    const showFitToBoundsButton = (await Promise.all(promises)).some((isFittable) => isFittable);
    if (this._isMounted && this.state.showFitToBoundsButton !== showFitToBoundsButton) {
      this.setState({ showFitToBoundsButton });
    }
  }

  async _loadShowTimesliderButton() {
    if (!this.props.settings.showTimesliderToggleButton) {
      if (this.state.showTimesliderButton) {
        this.setState({ showTimesliderButton: false });
      }
      return;
    }

    const promises = this.props.layerList.map(async (layer) => {
      return await layer.isFilteredByGlobalTime();
    });
    const showTimesliderButton = (await Promise.all(promises)).some(
      (isFilteredByGlobalTime) => isFilteredByGlobalTime
    );
    if (this._isMounted && this.state.showTimesliderButton !== showTimesliderButton) {
      this.setState({ showTimesliderButton });
    }
  }

  render() {
    const {
      addFilters,
      getFilterActions,
      getActionContext,
      onSingleValueTrigger,
      flyoutDisplay,
      isFullScreen,
      exitFullScreen,
      mapInitError,
      renderTooltipContent,
    } = this.props;

    if (mapInitError) {
      return (
        <KbnDangerCallout
          announceOnMount
          title={i18n.translate('xpack.maps.map.initializeErrorTitle', {
            defaultMessage: 'Unable to initialize map',
          })}
          text={mapInitError}
        />
      );
    }

    let exitFullScreenButton;
    if (isFullScreen) {
      exitFullScreenButton = <ExitFullScreenButton onExit={exitFullScreen} />;
    }

    return (
      <EuiFlexGroup gutterSize="none" responsive={false}>
        <EuiFlexItem
          css={mapWrapperStyles}
          style={{ backgroundColor: this.props.settings.backgroundColor }}
        >
          <MapControlsThemeStyles />
          <MBMap
            addFilters={addFilters}
            getFilterActions={getFilterActions}
            getActionContext={getActionContext}
            onSingleValueTrigger={onSingleValueTrigger}
            renderTooltipContent={renderTooltipContent}
          />
          {!this.props.settings.hideToolbarOverlay && !isScreenshotMode() && (
            <ToolbarOverlay
              addFilters={addFilters}
              getFilterActions={getFilterActions}
              getActionContext={getActionContext}
              showFitToBoundsButton={this.state.showFitToBoundsButton}
              showTimesliderButton={this.state.showTimesliderButton}
            />
          )}
          <RightSideControls />
          {this.props.isTimesliderOpen && (
            <Timeslider waitForTimesliceToLoad$={this.props.waitUntilTimeLayersLoad$} />
          )}
        </EuiFlexItem>
        <FlyoutPanelWrapper flyoutDisplay={flyoutDisplay} />
        {exitFullScreenButton}
      </EuiFlexGroup>
    );
  }
}

const componentStyles = {
  flyoutPanelWrapperStyles: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.backgroundBaseSubdued,
      overflow: 'hidden',
      borderLeftWidth: 1,
      borderLeftColor: euiTheme.colors.borderBaseSubdued,
      borderLeftStyle: 'solid',
      width: 0,
      '& > *': {
        width: `calc(${euiTheme.size.xxl} * 12)`,
      },
    }),
  flyoutVisibleStyles: ({ euiTheme }: UseEuiTheme) =>
    css({
      width: `calc(${euiTheme.size.xxl} * 12)`,
      transition: `width ${euiTheme.animation.normal} ${euiTheme.animation.resistance}`,
    }),
};

const FlyoutPanelWrapper = ({ flyoutDisplay }: { flyoutDisplay: FLYOUT_STATE }) => {
  let flyoutPanel = null;
  if (flyoutDisplay === FLYOUT_STATE.ADD_LAYER_WIZARD) {
    flyoutPanel = <AddLayerPanel />;
  } else if (flyoutDisplay === FLYOUT_STATE.LAYER_PANEL) {
    flyoutPanel = <EditLayerPanel />;
  } else if (flyoutDisplay === FLYOUT_STATE.MAP_SETTINGS_PANEL) {
    flyoutPanel = <MapSettingsPanel />;
  }
  const isVisible = !!flyoutPanel;
  const styles = useMemoCss(componentStyles);
  return (
    <EuiFlexItem
      css={[styles.flyoutPanelWrapperStyles, isVisible && styles.flyoutVisibleStyles]}
      grow={false}
    >
      {flyoutPanel}
    </EuiFlexItem>
  );
};
