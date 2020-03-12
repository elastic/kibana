/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import PropTypes from 'prop-types';
// @ts-ignore no @types definition
import { Shortcuts } from 'react-shortcuts';
import { EuiFlexItem, EuiFlexGroup, EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { ComponentStrings } from '../../../i18n';
import { ToolTipShortcut } from '../tool_tip_shortcut/';
import { ControlSettings } from './control_settings';
// @ts-ignore untyped local
import { RefreshControl } from './refresh_control';
// @ts-ignore untyped local
import { FullscreenControl } from './fullscreen_control';
import { ElementMenu } from './element_menu';
import { ShareMenu } from './share_menu';
import { ViewMenu } from './view_menu';

const { WorkpadHeader: strings } = ComponentStrings;

export interface Props {
  isWriteable: boolean;
  toggleWriteable: () => void;
  canUserWrite: boolean;
}

export const WorkpadHeader: FunctionComponent<Props> = ({
  isWriteable,
  canUserWrite,
  toggleWriteable,
}) => {
  const keyHandler = (action: string) => {
    if (action === 'EDITING') {
      toggleWriteable();
    }
  };

  const fullscreenButton = ({ toggleFullscreen }: { toggleFullscreen: () => void }) => (
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

  const getEditToggleToolTipText = () => {
    if (!canUserWrite) {
      return strings.getNoWritePermissionTooltipText();
    }

    const content = isWriteable
      ? strings.getHideEditControlTooltip()
      : strings.getShowEditControlTooltip();

    return content;
  };

  const getEditToggleToolTip = ({ textOnly } = { textOnly: false }) => {
    const content = getEditToggleToolTipText();

    if (textOnly) {
      return content;
    }

    return (
      <span>
        {content} <ToolTipShortcut namespace="EDITOR" action="EDITING" />
      </span>
    );
  };

  return (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="center"
      justifyContent="spaceBetween"
      className="canvasLayout__stageHeaderInner"
    >
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="xs">
          {isWriteable && (
            <EuiFlexItem grow={false}>
              <ElementMenu />
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <ViewMenu />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ShareMenu />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ControlSettings />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            {canUserWrite && (
              <Shortcuts
                name="EDITOR"
                handler={keyHandler}
                targetNodeSelector="body"
                global
                isolate
              />
            )}
            <EuiToolTip position="bottom" content={getEditToggleToolTip()}>
              <EuiButtonIcon
                iconType={isWriteable ? 'eye' : 'eyeClosed'}
                onClick={toggleWriteable}
                size="s"
                aria-label={getEditToggleToolTipText()}
                isDisabled={!canUserWrite}
              />
            </EuiToolTip>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <RefreshControl />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <FullscreenControl>{fullscreenButton}</FullscreenControl>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

WorkpadHeader.propTypes = {
  isWriteable: PropTypes.bool,
  toggleWriteable: PropTypes.func,
  canUserWrite: PropTypes.bool,
};
