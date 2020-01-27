/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { darken, readableColor } from 'polished';
import React from 'react';

import { i18n } from '@kbn/i18n';

import { ConditionalToolTip } from './conditional_tooltip';
import euiStyled from '../../../../../common/eui_styled_components';
import { InfraNodeType } from '../../graphql/types';
import { InfraWaffleMapBounds, InfraWaffleMapNode, InfraWaffleMapOptions } from '../../lib/lib';
import { colorFromValue } from './lib/color_from_value';
import { NodeContextMenu } from './node_context_menu';

const initialState = {
  isPopoverOpen: false,
};

type State = Readonly<typeof initialState>;

interface Props {
  squareSize: number;
  options: InfraWaffleMapOptions;
  node: InfraWaffleMapNode;
  formatter: (val: number) => string;
  bounds: InfraWaffleMapBounds;
  nodeType: InfraNodeType;
  currentTime: number;
}

export const Node = class extends React.PureComponent<Props, State> {
  public readonly state: State = initialState;
  public render() {
    const { nodeType, node, options, squareSize, bounds, formatter, currentTime } = this.props;
    const { isPopoverOpen } = this.state;
    const { metric } = node;
    const valueMode = squareSize > 70;
    const ellipsisMode = squareSize > 30;
    const rawValue = (metric && metric.value) || 0;
    const color = colorFromValue(options.legend, rawValue, bounds);
    const value = formatter(rawValue);
    const nodeAriaLabel = i18n.translate('xpack.infra.node.ariaLabel', {
      defaultMessage: '{nodeName}, click to open menu',
      values: { nodeName: node.name },
    });
    return (
      <NodeContextMenu
        node={node}
        nodeType={nodeType}
        isPopoverOpen={isPopoverOpen}
        closePopover={this.closePopover}
        options={options}
        currentTime={currentTime}
        popoverPosition="downCenter"
      >
        <ConditionalToolTip
          delay="regular"
          hidden={isPopoverOpen}
          position="top"
          content={`${node.name} | ${value}`}
        >
          <NodeContainer
            data-test-subj="nodeContainer"
            style={{ width: squareSize || 0, height: squareSize || 0 }}
            onClick={this.togglePopover}
          >
            <SquareOuter color={color}>
              <SquareInner color={color}>
                {valueMode ? (
                  <ValueInner aria-label={nodeAriaLabel}>
                    <Label color={color}>{node.name}</Label>
                    <Value color={color}>{value}</Value>
                  </ValueInner>
                ) : (
                  ellipsisMode && (
                    <ValueInner aria-label={nodeAriaLabel}>
                      <Label color={color}>...</Label>
                    </ValueInner>
                  )
                )}
              </SquareInner>
            </SquareOuter>
          </NodeContainer>
        </ConditionalToolTip>
      </NodeContextMenu>
    );
  }

  private togglePopover = () => {
    this.setState(prevState => ({ isPopoverOpen: !prevState.isPopoverOpen }));
  };

  private closePopover = () => {
    if (this.state.isPopoverOpen) {
      this.setState({ isPopoverOpen: false });
    }
  };
};

const NodeContainer = euiStyled.div`
  position: relative;
`;

interface ColorProps {
  color: string;
}

const SquareOuter = euiStyled.div<ColorProps>`
  position: absolute;
  top: 4px;
  left: 4px;
  bottom: 4px;
  right: 4px;
  background-color: ${props => darken(0.1, props.color)};
  border-radius: 3px;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.2);
`;

const SquareInner = euiStyled.div<ColorProps>`
  cursor: pointer;
  position: absolute;
  top: 0;
  right: 0;
  bottom: 2px;
  left: 0;
  border-radius: 3px;
  background-color: ${props => props.color};
`;

const ValueInner = euiStyled.button`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  line-height: 1.2em;
  align-items: center;
  align-content: center;
  padding: 1em;
  overflow: hidden;
  flex-wrap: wrap;
  width: 100%;
  border: none;
  &:focus {
    outline: none !important;
    border: ${params => params.theme.eui.euiFocusRingSize} solid
      ${params => params.theme.eui.euiFocusRingColor};
    box-shadow: none;
  }
`;

const SquareTextContent = euiStyled.div<ColorProps>`
  text-align: center;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1 0 auto;
  color: ${props => readableColor(props.color)};
`;

const Value = euiStyled(SquareTextContent)`
  font-weight: bold;
  font-size: 0.9em;
  line-height: 1.2em;
`;

const Label = euiStyled(SquareTextContent)`
  font-size: 0.7em;
  margin-bottom: 0.7em;
`;
