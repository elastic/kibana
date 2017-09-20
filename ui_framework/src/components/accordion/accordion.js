import React, {
  Component,
} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import {
  KuiKeyboardAccessible,
  KuiIcon,
  KuiFlexGroup,
  KuiFlexItem,
} from '../../components';

export class KuiAccordion extends Component {
  static propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
  }

  constructor(props) {
    super(props);

    this.state = {
      isOpen: false,
    };

    this.onToggleOpen = this.onToggleOpen.bind(this);
  }

  onToggleOpen() {
    const currentState = this.state.isOpen;
    const height = this.childContent.clientHeight;
    this.setState({
      isOpen: !currentState,
    });

    if (!currentState) {
      this.childWrapper.setAttribute('style', `height: ${height}px`);
    } else {
      this.childWrapper.setAttribute('style', `height: 0px`);
    }
  }

  render() {
    const {
      children,
      buttonContent,
      className,
      buttonClassName,
      buttonContentClassName,
      extraAction,
      ...rest,
    } = this.props;

    const classes = classNames(
      'kuiAccordion',
      {
        'kuiAccordion-isOpen': this.state.isOpen,
      },
      className
    );

    const buttonClasses = classNames(
      'kuiAccordion__button',
      buttonClassName,
    );

    const buttonContentClasses = classNames(
      'kuiAccordion__buttonContent',
      buttonContentClassName,
    );

    const icon = (
      <KuiIcon type={this.state.isOpen ? 'arrowDown' : 'arrowRight'} size="medium" />
    );

    let optionalAction = null;

    if (extraAction) {
      optionalAction = (
        <KuiFlexItem grow={false}>
          {extraAction}
        </KuiFlexItem>
      );
    }

    return (
      <div
        className={classes}
        {...rest}
      >
        <KuiFlexGroup gutterSize="none" alignItems="center">
          <KuiFlexItem>
            <KuiKeyboardAccessible>
              <div onClick={this.onToggleOpen} className={buttonClasses}>
                <KuiFlexGroup gutterSize="small" alignItems="center">
                  <KuiFlexItem grow={false}>
                    {icon}
                  </KuiFlexItem>
                  <KuiFlexItem className={buttonContentClasses}>
                    {buttonContent}
                  </KuiFlexItem>
                </KuiFlexGroup>
              </div>
            </KuiKeyboardAccessible>
          </KuiFlexItem>
          {optionalAction}
        </KuiFlexGroup>

        <div className="kuiAccordion__childWrapper"  ref={node => { this.childWrapper = node; }}>
          <div ref={node => { this.childContent = node; }}>
            {children}
          </div>
        </div>
      </div>
    );
  }
}

KuiAccordion.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  buttonContentClassName: PropTypes.string,
  buttonContent: PropTypes.node,
  extraAction: PropTypes.node,
};
