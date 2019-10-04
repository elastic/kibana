/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint react/no-did-mount-set-state: 0, react/forbid-elements: 0 */
import React, { ReactNode, ReactElement, Component, MouseEvent } from 'react';
import PropTypes from 'prop-types';
import { EuiToolTip, ToolTipPositions, EuiPopover, PropsOf } from '@elastic/eui';

export interface PopoverChildrenProps {
  closePopover: () => void;
}

type EuiPopoverProps = PropsOf<EuiPopover>;
interface Props extends Omit<EuiPopoverProps, 'button' | 'isOpen' | 'closePopover' | 'container'> {
  isOpen?: boolean;
  ownFocus?: boolean;

  button: (handleClick: (ev: MouseEvent) => void) => ReactElement<any>;

  children: (props: PopoverChildrenProps) => ReactNode;

  tooltip: string;
  tooltipPosition: ToolTipPositions;
}

interface State {
  isPopoverOpen: boolean;
}

export class Popover extends Component<Props, State> {
  static propTypes = {
    isOpen: PropTypes.bool,
    ownFocus: PropTypes.bool,
    button: PropTypes.func.isRequired,
    children: PropTypes.func.isRequired,
    tooltip: PropTypes.string,
    tooltipPosition: PropTypes.oneOf(['top', 'bottom', 'left', 'right']),
  };

  static defaultProps = {
    isOpen: false,
    ownFocus: true,
    tooltip: '',
    tooltipPosition: 'top',
  };

  state = {
    isPopoverOpen: false,
  };

  componentDidMount() {
    if (this.props.isOpen) {
      this.setState({ isPopoverOpen: true });
    }
  }

  handleClick = () => {
    this.setState(state => ({
      isPopoverOpen: !state.isPopoverOpen,
    }));
  };

  closePopover = () => {
    this.setState({
      isPopoverOpen: false,
    });
  };

  render() {
    const { button, children, tooltip, tooltipPosition, ...rest } = this.props;

    const wrappedButton = (handleClick: (ev: MouseEvent) => void) => {
      // wrap button in tooltip, if tooltip text is provided
      if (!this.state.isPopoverOpen && tooltip.length) {
        return (
          <EuiToolTip position={tooltipPosition} content={tooltip}>
            {button(handleClick)}
          </EuiToolTip>
        );
      }

      return button(handleClick);
    };

    const appWrapper = document.querySelector('.app-wrapper');

    return (
      <EuiPopover
        {...rest}
        button={wrappedButton(this.handleClick)}
        isOpen={this.state.isPopoverOpen}
        closePopover={this.closePopover}
        container={appWrapper as HTMLElement}
      >
        {children({ closePopover: this.closePopover })}
      </EuiPopover>
    );
  }
}
