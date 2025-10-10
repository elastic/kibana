/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../_index.scss';
import React, { Component } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiCallOut,
  EuiFlyoutResizable,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { v4 as uuidv4 } from 'uuid';
import type { Filter } from '@kbn/es-query';
import type { ActionExecutionContext, Action } from '@kbn/ui-actions-plugin/public';
import type { Observable } from 'rxjs';
import { ExitFullScreenButton } from '@kbn/shared-ux-button-exit-full-screen';
import { css } from '@emotion/react';
import { focusFirstFocusable } from '@kbn/presentation-util/src/focus_helpers';
import { MBMap } from '../mb_map';
import { RightSideControls } from '../right_side_controls';
import { Timeslider } from '../timeslider';
import { ToolbarOverlay } from '../toolbar_overlay';
import { isScreenshotMode } from '../../kibana_services';
import type { RawValue } from '../../../common/constants';
import { RENDER_TIMEOUT } from '../../../common/constants';
import { FLYOUT_STATE } from '../../reducers/ui';
import type { MapSettings } from '../../../common/descriptor_types';
import type { RenderToolTipContent } from '../../classes/tooltips/tooltip_property';
import type { ILayer } from '../../classes/layers/layer';
import { AddLayerPanel } from '../add_layer_panel';
import { EditLayerPanel } from '../edit_layer_panel';
import { MapSettingsPanel } from '../map_settings_panel';

const RENDER_COMPLETE_EVENT = 'renderComplete';

export interface Props {
  addFilters: ((filters: Filter[], actionId: string) => Promise<void>) | null;
  getFilterActions?: () => Promise<Action[]>;
  getActionContext?: () => ActionExecutionContext;
  onSingleValueTrigger?: (actionId: string, key: string, value: RawValue) => Promise<void>;
  isMapLoading: boolean;
  cancelAllInFlightRequests: () => void;
  exitFullScreen: () => void;
  closeFlyout: () => void;
  flyoutDisplay: FLYOUT_STATE;
  isFullScreen: boolean;
  isTimesliderOpen: boolean;
  indexPatternIds: string[];
  mapInitError: string | null | undefined;
  selectedLayerId: string | null;
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

export class MapContainer extends Component<Props, State> {
  private _isMounted: boolean = false;
  private _isInitalLoadRenderTimerStarted: boolean = false;

  private _flyoutRef: React.RefObject<HTMLDivElement> = React.createRef<HTMLDivElement>();

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
  }

  componentDidUpdate(prevProps: Props) {
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

    if (
      // If a new type of flyout opens
      prevProps.flyoutDisplay !== this.props.flyoutDisplay ||
      // Or if an edit panel is open and the user opens a different edit panel
      (this.props.flyoutDisplay === FLYOUT_STATE.LAYER_PANEL &&
        prevProps.selectedLayerId !== this.props.selectedLayerId)
    ) {
      this._updateFlyout(this.props.flyoutDisplay);
    }
  }

  componentWillUnmount() {
    this._isMounted = false;
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

  _updateFlyout = (flyoutDisplay: FLYOUT_STATE) => {
    if (flyoutDisplay !== FLYOUT_STATE.NONE) {
      if (this._flyoutRef.current) {
        // Shift focus to the first focusable item inside the flyout
        focusFirstFocusable(this._flyoutRef.current);
      }
    }
  };

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
      isFullScreen,
      exitFullScreen,
      mapInitError,
      renderTooltipContent,
      closeFlyout,
    } = this.props;

    if (mapInitError) {
      return (
        <div
          data-render-complete
          data-shared-item
          data-title={this.props.title}
          data-description={this.props.description}
        >
          <EuiCallOut
            title={i18n.translate('xpack.maps.map.initializeErrorTitle', {
              defaultMessage: 'Unable to initialize map',
            })}
            color="danger"
            iconType="cross"
          >
            <p>{mapInitError}</p>
          </EuiCallOut>
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
          {this.props.isTimesliderOpen && (
            <Timeslider waitForTimesliceToLoad$={this.props.waitUntilTimeLayersLoad$} />
          )}
          <RightSideControls />
        </EuiFlexItem>
        <FlyoutPanelWrapper
          panelRef={this._flyoutRef}
          flyoutDisplay={this.props.flyoutDisplay}
          onClose={closeFlyout}
        />
        {exitFullScreenButton}
      </EuiFlexGroup>
    );
  }
}

const FlyoutPanelWrapper = ({
  flyoutDisplay,
  onClose,
  panelRef,
}: {
  flyoutDisplay: FLYOUT_STATE;
  onClose: () => void;
  panelRef: React.RefObject<HTMLDivElement>;
}) => {
  const ariaLabelId = useGeneratedHtmlId();
  let flyoutPanel = null;
  if (flyoutDisplay === FLYOUT_STATE.ADD_LAYER_WIZARD) {
    flyoutPanel = <AddLayerPanel ariaLabelId={ariaLabelId} />;
  } else if (flyoutDisplay === FLYOUT_STATE.LAYER_PANEL) {
    flyoutPanel = <EditLayerPanel ariaLabelId={ariaLabelId} />;
  } else if (flyoutDisplay === FLYOUT_STATE.MAP_SETTINGS_PANEL) {
    flyoutPanel = <MapSettingsPanel ariaLabelId={ariaLabelId} />;
  }
  if (!flyoutPanel) return null;
  return (
    <EuiFlyoutResizable
      aria-labelledby={ariaLabelId}
      ref={panelRef}
      type="push"
      size="s"
      maxWidth={800}
      paddingSize="m"
      outsideClickCloses={false}
      onClose={onClose}
      closeButtonProps={{
        // Inspector overlay also uses an EuiFlyout with a close button, so set a different data-test-subj
        // to avoid a conflict
        'data-test-subj': 'mapContainerFlyoutCloseButton',
      }}
    >
      {flyoutPanel}
    </EuiFlyoutResizable>
  );
};
