/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { pure } from 'recompose';
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

interface State {
  showHoverContent: boolean;
}

const HoverActionsPanelContainer = styled.div`
  height: 100%;
  position: relative;
`;

const HoverActionsPanel = pure<{ children: JSX.Element; show: boolean }>(({ children, show }) => (
  <HoverActionsPanelContainer data-test-subj="hover-actions-panel-container">
    {show ? children : null}
  </HoverActionsPanelContainer>
));

const WithHoverActionsContainer = styled.div`
  display: flex;
  flex-direction: row;
  height: 100%;
  padding-right: 5px;
`;

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
export class WithHoverActions extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = { showHoverContent: false };
  }

  public render() {
    const { alwaysShow = false, hoverContent, render } = this.props;

    return (
      <WithHoverActionsContainer onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
        <>{render(this.state.showHoverContent)}</>
        <HoverActionsPanel show={this.state.showHoverContent || alwaysShow}>
          {hoverContent != null ? hoverContent : <></>}
        </HoverActionsPanel>
      </WithHoverActionsContainer>
    );
  }

  private onMouseEnter = () => {
    this.setState({ showHoverContent: true });
  };

  private onMouseLeave = () => {
    this.setState({ showHoverContent: false });
  };
}
