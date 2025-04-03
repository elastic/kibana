/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPortal,
  useEuiPaddingCSS,
  useEuiTheme,
} from '@elastic/eui';
import { EuiResizableButton, EuiPanel, keys } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

const getMouseOrTouchY = (
  e: TouchEvent | MouseEvent | React.MouseEvent | React.TouchEvent
): number => {
  const x = (e as TouchEvent).targetTouches
    ? (e as TouchEvent).targetTouches[0].pageY
    : (e as MouseEvent).pageY;
  return -x;
};

export const ResizablePanelComponent: React.FunctionComponent<{
  topBar: React.ReactNode;
  children: React.ReactNode;
  isCollapsed: boolean;
}> = ({ children, isCollapsed, topBar }) => {
  const euiTheme = useEuiTheme();
  const [panelHeight, setPanelHeight] = useState(300);
  const initialPanelHeight = useRef(panelHeight);
  const initialMouseY = useRef(0);

  const onMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    const mouseOffset = getMouseOrTouchY(e) - initialMouseY.current;
    const changedPanelHeight = initialPanelHeight.current + mouseOffset;

    setPanelHeight(Math.max(changedPanelHeight, 0));
  }, []);

  const onMouseUp = useCallback(() => {
    initialMouseY.current = 0;

    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    window.removeEventListener('touchmove', onMouseMove);
    window.removeEventListener('touchend', onMouseUp);
  }, [onMouseMove]);

  const onMouseDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      initialMouseY.current = getMouseOrTouchY(e);
      initialPanelHeight.current = panelHeight;

      // Window event listeners instead of React events are used
      // in case the user's mouse leaves the component
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('touchmove', onMouseMove);
      window.addEventListener('touchend', onMouseUp);
    },
    [panelHeight, onMouseMove, onMouseUp]
  );

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    const KEYBOARD_OFFSET = 10;

    switch (e.key) {
      case keys.ARROW_UP:
        e.preventDefault(); // Safari+VO will screen reader navigate off the button otherwise
        setPanelHeight((currentPanelHeight) => currentPanelHeight + KEYBOARD_OFFSET);
        break;
      case keys.ARROW_DOWN:
        e.preventDefault(); // Safari+VO will screen reader navigate off the button otherwise
        setPanelHeight((currentPanelHeight) => Math.max(currentPanelHeight - KEYBOARD_OFFSET, 0));
    }
  }, []);

  return (
    <EuiPanel
      css={css`
        position: fixed;
        padding: 0;
        bottom: 0;
        background: ${euiTheme.euiTheme.colors.backgroundBasePlain};
      `}
    >
      {topBar}
      <EuiResizableButton
        css={css`
          position: absolute;
          top: 0;
        `}
        onMouseDown={onMouseDown}
        onTouchStart={onMouseDown}
        onKeyDown={onKeyDown}
        disabled={isCollapsed}
      />
      <EuiPanel
        paddingSize="none"
        css={css`
          background: ${euiTheme.euiTheme.colors.backgroundBasePlain};
          height: ${isCollapsed ? 0 : panelHeight}px;
          overflow: auto;
        `}
      >
        {children}
      </EuiPanel>
    </EuiPanel>
  );
};

export const ResizablePanel: React.FunctionComponent<{
  title: React.ReactNode;
  content: React.ReactNode;
  onClose: () => void;
}> = ({ title, content, onClose }) => {
  const euiTheme = useEuiTheme();

  const paddingStyles = useEuiPaddingCSS();
  const cssStyles = [paddingStyles.m];

  const toggleCollpase = useCallback(() => {
    setIsCollapsed((current) => !current);
  }, []);

  const [isCollapsed, setIsCollapsed] = useState(false);

  const topBar = (
    <EuiFlexGroup
      css={css`
        background: ${euiTheme.euiTheme.colors.backgroundBaseFormsPrepend};
        ${cssStyles}
      `}
      responsive={false}
      gutterSize="s"
    >
      <EuiFlexItem>{title}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup responsive={false} gutterSize="none">
          <EuiFlexItem grow={false}>
            {isCollapsed ? (
              <EuiButtonIcon
                key="arrowUp"
                iconType="arrowUp"
                aria-label={i18n.translate(
                  'xpack.fleet.integrationsResizablePanel.collapseButton',
                  { defaultMessage: 'Collapse panel' }
                )}
                color="text"
                onClick={toggleCollpase}
              />
            ) : (
              <EuiButtonIcon
                key="arrowDown"
                iconType="arrowDown"
                aria-label={i18n.translate(
                  'xpack.fleet.integrationsResizablePanel.collapseButton',
                  { defaultMessage: 'Collapse panel' }
                )}
                color="text"
                onClick={toggleCollpase}
              />
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="cross"
              aria-label={i18n.translate('xpack.fleet.integrationsResizablePanel.closeButton', {
                defaultMessage: 'Close panel',
              })}
              color="text"
              onClick={onClose}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <EuiPortal>
      <ResizablePanelComponent isCollapsed={isCollapsed} topBar={topBar}>
        {content}
      </ResizablePanelComponent>
    </EuiPortal>
  );
};
