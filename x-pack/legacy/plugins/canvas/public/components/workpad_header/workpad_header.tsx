/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
// @ts-ignore no @types definition
import { Shortcuts } from 'react-shortcuts';
import {
  EuiFlexItem,
  EuiFlexGroup,
  EuiButtonIcon,
  EuiButton,
  EuiButtonEmpty,
  EuiOverlayMask,
  EuiModal,
  EuiModalFooter,
  EuiToolTip,
} from '@elastic/eui';

import { ComponentStrings } from '../../../i18n';

// @ts-ignore untyped local
import { AssetManager } from '../asset_manager';
// @ts-ignore untyped local
import { ElementTypes } from '../element_types';
import { ToolTipShortcut } from '../tool_tip_shortcut/';
import { AddEmbeddablePanel } from '../embeddable_flyout';
// @ts-ignore untyped local
import { ControlSettings } from './control_settings';
// @ts-ignore untyped local
import { RefreshControl } from './refresh_control';
// @ts-ignore untyped local
import { FullscreenControl } from './fullscreen_control';
import { WorkpadExport } from './workpad_export';
import { WorkpadZoom } from './workpad_zoom';

const { WorkpadHeader: strings } = ComponentStrings;

export interface Props {
  isWriteable: boolean;
  toggleWriteable: () => void;
  canUserWrite: boolean;
  selectedPage: string;
}

interface State {
  isModalVisible: boolean;
  isPanelVisible: boolean;
}

export class WorkpadHeader extends React.PureComponent<Props, State> {
  static propTypes = {
    isWriteable: PropTypes.bool,
    toggleWriteable: PropTypes.func,
  };

  state = { isModalVisible: false, isPanelVisible: false };

  _fullscreenButton = ({ toggleFullscreen }: { toggleFullscreen: () => void }) => (
    <EuiToolTip
      position="bottom"
      content={
        <span>
          {strings.getFullScreenTooltip()}{' '}
          <ToolTipShortcut namespace="PRESENTATION" action="FULLSCREEN" />
        </span>
      }
    >
      <EuiButtonIcon
        iconType="fullScreen"
        aria-label={strings.getFullScreenButtonAriaLabel()}
        onClick={toggleFullscreen}
      />
    </EuiToolTip>
  );

  _keyHandler = (action: string) => {
    if (action === 'EDITING') {
      this.props.toggleWriteable();
    }
  };

  _hideElementModal = () => this.setState({ isModalVisible: false });
  _showElementModal = () => this.setState({ isModalVisible: true });

  _hideEmbeddablePanel = () => this.setState({ isPanelVisible: false });
  _showEmbeddablePanel = () => this.setState({ isPanelVisible: true });

  _elementAdd = () => (
    <EuiOverlayMask>
      <EuiModal
        onClose={this._hideElementModal}
        className="canvasModal--fixedSize"
        maxWidth="1000px"
        initialFocus=".canvasElements__filter input"
      >
        <ElementTypes onClose={this._hideElementModal} />
        <EuiModalFooter>
          <EuiButton size="s" onClick={this._hideElementModal}>
            {strings.getAddElementModalCloseButtonLabel()}
          </EuiButton>
        </EuiModalFooter>
      </EuiModal>
    </EuiOverlayMask>
  );

  _embeddableAdd = () => <AddEmbeddablePanel onClose={this._hideEmbeddablePanel} />;

  _getEditToggleToolTipText = () => {
    if (!this.props.canUserWrite) {
      return strings.getNoWritePermissionTooltipText();
    }

    const content = this.props.isWriteable
      ? strings.getHideEditControlTooltip()
      : strings.getShowEditControlTooltip();

    return content;
  };

  _getEditToggleToolTip = ({ textOnly } = { textOnly: false }) => {
    const content = this._getEditToggleToolTipText();

    if (textOnly) {
      return content;
    }

    return (
      <span>
        {content} <ToolTipShortcut namespace="EDITOR" action="EDITING" />
      </span>
    );
  };

  render() {
    const { isWriteable, canUserWrite, toggleWriteable } = this.props;
    const { isModalVisible, isPanelVisible } = this.state;

    return (
      <div>
        {isModalVisible ? this._elementAdd() : null}
        {isPanelVisible ? this._embeddableAdd() : null}
        <EuiFlexGroup
          gutterSize="s"
          alignItems="center"
          justifyContent="spaceBetween"
          className="canvasLayout__stageHeaderInner"
        >
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" gutterSize="xs">
              <EuiFlexItem grow={false}>
                <ControlSettings />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <RefreshControl />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <FullscreenControl>{this._fullscreenButton}</FullscreenControl>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <WorkpadZoom />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <WorkpadExport />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                {canUserWrite && (
                  <Shortcuts
                    name="EDITOR"
                    handler={this._keyHandler}
                    targetNodeSelector="body"
                    global
                    isolate
                  />
                )}
                <EuiToolTip position="bottom" content={this._getEditToggleToolTip()}>
                  <EuiButtonIcon
                    iconType={isWriteable ? 'lockOpen' : 'lock'}
                    onClick={toggleWriteable}
                    size="s"
                    aria-label={this._getEditToggleToolTipText()}
                    isDisabled={!canUserWrite}
                  />
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          {isWriteable ? (
            <EuiFlexItem grow={false}>
              <EuiFlexGroup alignItems="center" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <AssetManager />
                </EuiFlexItem>

                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty onClick={this._showEmbeddablePanel}>
                    {strings.getEmbedObjectButtonLabel()}
                  </EuiButtonEmpty>
                </EuiFlexItem>

                <EuiFlexItem grow={false}>
                  <EuiButton
                    fill
                    size="s"
                    iconType="vector"
                    data-test-subj="add-element-button"
                    onClick={this._showElementModal}
                  >
                    {strings.getAddElementButtonLabel()}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      </div>
    );
  }
}
