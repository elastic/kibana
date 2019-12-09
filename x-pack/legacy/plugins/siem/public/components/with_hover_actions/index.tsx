/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useCallback } from 'react';
import styled from 'styled-components';

interface Props {
  /**
   * Always show the hover menu contents (default: false)
   */
  alwaysShow?: boolean;
  /**
   * The contents of the hover menu. It is highly recommended you wrap this
   * content in a `div` with `position: absolute` to prevent it from effecting
   * layout, and to adjust it's position via `top` and `left`.
   */
  hoverContent?: JSX.Element;
  /**
   * The content that will be wrapped with hover actions. In addition to
   * rendering the `hoverContent` when the user hovers, this render prop
   * passes `showHoverContent` to provide a signal that it is in the hover
   * state.
   */
  render: (showHoverContent: boolean) => JSX.Element;
}

const HoverActionsPanelContainer = styled.div`
  color: ${({ theme }) => theme.eui.textColors.default};
  height: 100%;
  position: relative;
`;

HoverActionsPanelContainer.displayName = 'HoverActionsPanelContainer';

const HoverActionsPanel = React.memo<{ children: JSX.Element; show: boolean }>(
  ({ children, show }) => (
    <HoverActionsPanelContainer data-test-subj="hover-actions-panel-container">
      {show ? children : null}
    </HoverActionsPanelContainer>
  )
);

HoverActionsPanel.displayName = 'HoverActionsPanel';

const WithHoverActionsContainer = styled.div`
  display: flex;
  flex-direction: row;
  height: 100%;
  padding-right: 5px;
`;

WithHoverActionsContainer.displayName = 'WithHoverActionsContainer';

/**
 * Decorates it's children with actions that are visible on hover.
 * This component does not enforce an opinion on the styling and
 * positioning of the hover content, but see the documentation for
 * the `hoverContent` for tips on (not) effecting layout on-hover.
 *
 * In addition to rendering the `hoverContent` prop on hover, this
 * component also passes `showHoverContent` as a render prop, which
 * provides a signal to the content that the user is in a hover state.
 */
export const WithHoverActions = React.memo<Props>(
  ({ alwaysShow = false, hoverContent, render }) => {
    const [showHoverContent, setShowHoverContent] = useState(false);
    const onMouseEnter = useCallback(() => {
      setShowHoverContent(true);
    }, []);

    const onMouseLeave = useCallback(() => {
      setShowHoverContent(false);
    }, []);

    return (
      <WithHoverActionsContainer onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
        <>{render(showHoverContent)}</>
        <HoverActionsPanel show={showHoverContent || alwaysShow}>
          {hoverContent != null ? hoverContent : <></>}
        </HoverActionsPanel>
      </WithHoverActionsContainer>
    );
  }
);

WithHoverActions.displayName = 'WithHoverActions';
