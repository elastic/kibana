/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { EuiPopover, EuiToolTip } from '@elastic/eui';

interface Props {
  button: (handleClick: React.MouseEventHandler<HTMLButtonElement>) => React.ReactElement;
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
  children: (arg: { closePopover: () => void }) => React.ReactElement;
  isOpen?: boolean;
  ownFocus?: boolean;
  tooltip?: string;
  panelClassName?: string;
  anchorPosition?: string;
  panelPaddingSize?: 'none' | 's' | 'm' | 'l';
  id?: string;
  className?: string;
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

  state: State = {
    isPopoverOpen: !!this.props.isOpen,
  };

  handleClick = () => {
    this.setState((state: any) => ({
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

    const wrappedButton = (handleClick: any) => {
      // wrap button in tooltip, if tooltip text is provided
      if (!this.state.isPopoverOpen && tooltip && tooltip.length) {
        return (
          <EuiToolTip position={tooltipPosition} content={tooltip}>
            {button(handleClick)}
          </EuiToolTip>
        );
      }

      return button(handleClick);
    };

    const appWrapper = document.querySelector('.app-wrapper');
    const EuiPopoverAny = EuiPopover as React.FC<any>;

    return (
      <EuiPopoverAny
        {...rest}
        button={wrappedButton(this.handleClick)}
        isOpen={this.state.isPopoverOpen}
        closePopover={this.closePopover}
        container={appWrapper}
      >
        {children({ closePopover: this.closePopover })}
      </EuiPopoverAny>
    );
  }
}
