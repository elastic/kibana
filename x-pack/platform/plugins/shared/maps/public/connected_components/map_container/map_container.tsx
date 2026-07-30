/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../_index.scss';
import React, { Component } from 'react';
import type { UseEuiTheme } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { v4 as uuidv4 } from 'uuid';
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
import { RENDER_TIMEOUT } from '../../../common/constants';
import { FLYOUT_STATE } from '../../reducers/ui';
import type { MapSettings } from '../../../common/descriptor_types';
import { MapSettingsPanel } from '../map_settings_panel';
import type { RenderToolTipContent } from '../../classes/tooltips/tooltip_property';
import type { ILayer } from '../../classes/layers/layer';

const RENDER_COMPLETE_EVENT = 'renderComplete';

export interface Props {
  addFilters: ((filters: Filter[], actionId: string) => Promise<void>) | null;
  getFilterActions?: () => Promise<Action[]>;
  getActionContext?: () => ActionExecutionContext;
  onSingleValueTrigger?: (actionId: string, key: string, value: RawValue) => Promise<void>;
  isMapLoading: boolean;
  cancelAllInFlightRequests: () => void;
  reload: () => void;
  exitFullScreen: () => void;
  flyoutDisplay: FLYOUT_STATE;
  isFullScreen: boolean;
  isTimesliderOpen: boolean;
  indexPatternIds: string[];
  mapInitError: string | null | undefined;
  renderTooltipContent?: RenderToolTipContent;
  title?: string;
  description?: string;
  settings: MapSettings;
  layerList: ILayer[];
  waitUntilTimeLayersLoad$: Observable<void>;
  /*
   * Set to false to exclude sharing attributes 'data-*'.
   * An example usage is tile_map and region_map visualizations. The visualizations use MapEmbeddable for rendering.
   * Visualize Embeddable handles sharing attributes so sharing attributes are not needed in the children.
   */
  isSharable: boolean;
  euiTheme?: any;
}

interface State {
  isInitialLoadRenderTimeoutComplete: boolean;
  domId: string;
  showFitToBoundsButton: boolean;
  showTimesliderButton: boolean;
}

const mapWrapperStyles = css({ position: 'relative' });

// SVG paths for the zoom in/out controls, based off of the EUI glyphs plusInCircleFilled and
// minusInCircleFilled. Rendered as a background-image so the fill color can be applied reactively.
const ZOOM_IN_ICON_PATH =
  'M8,7 L8,3.5 C8,3.22385763 7.77614237,3 7.5,3 C7.22385763,3 7,3.22385763 7,3.5 L7,7 L3.5,7 C3.22385763,7 3,7.22385763 3,7.5 C3,7.77614237 3.22385763,8 3.5,8 L7,8 L7,11.5 C7,11.7761424 7.22385763,12 7.5,12 C7.77614237,12 8,11.7761424 8,11.5 L8,8 L11.5,8 C11.7761424,8 12,7.77614237 12,7.5 C12,7.22385763 11.7761424,7 11.5,7 L8,7 Z M7.5,15 C3.35786438,15 0,11.6421356 0,7.5 C0,3.35786438 3.35786438,0 7.5,0 C11.6421356,0 15,3.35786438 15,7.5 C15,11.6421356 11.6421356,15 7.5,15 Z';
const ZOOM_OUT_ICON_PATH =
  'M7.5,0 C11.6355882,0 15,3.36441176 15,7.5 C15,11.6355882 11.6355882,15 7.5,15 C3.36441176,15 0,11.6355882 0,7.5 C0,3.36441176 3.36441176,0 7.5,0 Z M3.5,7 C3.22385763,7 3,7.22385763 3,7.5 C3,7.77614237 3.22385763,8 3.5,8 L11.5,8 C11.7761424,8 12,7.77614237 12,7.5 C12,7.22385763 11.7761424,7 11.5,7 L3.5,7 Z';

const zoomIconBackgroundImage = (path: string, color: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg width='15px' height='15px' viewBox='0 0 15 15' version='1.1' xmlns='http://www.w3.org/2000/svg'><path fill='${color}' d='${path}' /></svg>`
  )}") !important`;

/**
 * Applies theme-dependent colors to the imperatively-rendered MapLibre navigation control (zoom
 * buttons). These controls live outside React, so they are styled through a Global stylesheet that
 * reads the color mode via `useEuiTheme`, allowing them to follow reload-less light/dark switches.
 */
function MapControlsThemeStyles() {
  const { euiTheme } = useEuiTheme();
  const iconColor = euiTheme.colors.textParagraph;
  return (
    <Global
      styles={css({
        '.mapContainer': {
          '.maplibregl-ctrl-group:not(:empty)': {
            backgroundColor: euiTheme.colors.backgroundBasePlain,
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
          backgroundColor: euiTheme.colors.emptyShade,
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
          backgroundColor: `${euiTheme.colors.emptyShade} !important`,
        },
        '.mapWidgetOverlay .mapTocEntry__detailsToggleButton': {
          backgroundColor: euiTheme.colors.emptyShade,
          borderColor: euiTheme.border.color,
          color: euiTheme.colors.textParagraph,
        },
      })}
    />
  );
}

export class MapContainer extends Component<Props, State> {
  private _isMounted: boolean = false;
  private _isInitalLoadRenderTimerStarted: boolean = false;
  private _prevIsDarkMode: boolean = getIsDarkMode();
  private _themeSubscription?: Subscription;

  state: State = {
    isInitialLoadRenderTimeoutComplete: false,
    domId: uuidv4(),
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
    if (
      this.props.isSharable &&
      !this.props.isMapLoading &&
      !this._isInitalLoadRenderTimerStarted
    ) {
      this._isInitalLoadRenderTimerStarted = true;
      this._startInitialLoadRenderTimer();
    }
  }

  componentWillUnmount() {
    this._isMounted = false;
    this._themeSubscription?.unsubscribe();
    this.props.cancelAllInFlightRequests();
  }

  // Reporting uses both a `data-render-complete` attribute and a DOM event listener to determine
  // if a visualization is done loading. The process roughly is:
  // - See if the `data-render-complete` attribute is "true". If so we're done!
  // - If it's not, then reporting injects a listener into the browser for a custom "renderComplete" event.
  // - When that event is fired, we snapshot the viz and move on.
  // Failure to not have the dom attribute, or custom event, will timeout the job.
  // See x-pack/plugins/reporting/export_types/common/lib/screenshots/wait_for_render.ts for more.
  _onInitialLoadRenderComplete = () => {
    const el = document.querySelector(`[data-dom-id="${this.state.domId}"]`);

    if (el) {
      el.dispatchEvent(new CustomEvent(RENDER_COMPLETE_EVENT, { bubbles: true }));
    }
  };

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

  _startInitialLoadRenderTimer = () => {
    window.setTimeout(() => {
      if (this._isMounted) {
        this.setState({ isInitialLoadRenderTimeoutComplete: true });
        this._onInitialLoadRenderComplete();
      }
    }, RENDER_TIMEOUT);
  };

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
        <div
          data-render-complete
          data-shared-item
          data-title={this.props.title}
          data-description={this.props.description}
        >
          <KbnDangerCallout
            announceOnMount
            title={i18n.translate('xpack.maps.map.initializeErrorTitle', {
              defaultMessage: 'Unable to initialize map',
            })}
            text={mapInitError}
          />
        </div>
      );
    }

    let exitFullScreenButton;
    if (isFullScreen) {
      exitFullScreenButton = <ExitFullScreenButton onExit={exitFullScreen} />;
    }
    const shareAttributes = this.props.isSharable
      ? {
          ['data-dom-id']: this.state.domId,
          ['data-render-complete']: this.state.isInitialLoadRenderTimeoutComplete,
          ['data-shared-item']: true,
          ['data-title']: this.props.title,
          ['data-description']: this.props.description,
        }
      : {};

    return (
      <EuiFlexGroup gutterSize="none" responsive={false} {...shareAttributes}>
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
