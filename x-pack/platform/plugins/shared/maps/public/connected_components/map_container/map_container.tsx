/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../_index.scss';
import React, { Component } from 'react';
import type { UseEuiTheme } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Filter } from '@kbn/es-query';
import type { ActionExecutionContext, Action } from '@kbn/ui-actions-plugin/public';
import type { Observable } from 'rxjs';
import { ExitFullScreenButton } from '@kbn/shared-ux-button-exit-full-screen';
import { css } from '@emotion/react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { MBMap } from '../mb_map';
import { RightSideControls } from '../right_side_controls';
import { Timeslider } from '../timeslider';
import { ToolbarOverlay } from '../toolbar_overlay';
import { EditLayerPanel } from '../edit_layer_panel';
import { AddLayerPanel } from '../add_layer_panel';
import { isScreenshotMode } from '../../kibana_services';
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

export class MapContainer extends Component<Props, State> {
  private _isMounted: boolean = false;

  state: State = {
    showFitToBoundsButton: false,
    showTimesliderButton: false,
  };

  componentDidMount() {
    this._isMounted = true;
    this._loadShowFitToBoundsButton();
    this._loadShowTimesliderButton();
  }

  componentDidUpdate() {
    this._loadShowFitToBoundsButton();
    this._loadShowTimesliderButton();
  }

  componentWillUnmount() {
    this._isMounted = false;
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
        <EuiCallOut
          announceOnMount
          title={i18n.translate('xpack.maps.map.initializeErrorTitle', {
            defaultMessage: 'Unable to initialize map',
          })}
          color="danger"
          iconType="cross"
        >
          <p>{mapInitError}</p>
        </EuiCallOut>
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
