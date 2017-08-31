import React, {
  Component,
} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import {
  KuiIcon,
  KuiFlexGroup,
  KuiFlexItem,
} from '../../components';

export class KuiAccordian extends Component {
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
      ...rest,
    } = this.props;

    const classes = classNames(
      'kuiAccordian',
      {
        'kuiAccordian-isOpen': this.state.isOpen,
      },
      className
    );

    const buttonClasses = classNames(
      'kuiAccordian__button',
      buttonClassName,
    );

    const buttonContentClasses = classNames(
      'kuiAccordian__buttonContent',
      buttonContentClassName,
    );

    const icon = (
      <KuiIcon type={this.state.isOpen ? 'arrowDown' : 'arrowRight'} size="medium" />
    );

    return (
      <div
        className={classes}
        {...rest}
      >
        <button onClick={this.onToggleOpen} className={buttonClasses}>
          <KuiFlexGroup gutterSize="small" alignItems="center">
            <KuiFlexItem grow={false}>
              {icon}
            </KuiFlexItem>
            <KuiFlexItem className={buttonContentClasses}>
              {buttonContent}
            </KuiFlexItem>
          </KuiFlexGroup>
        </button>

        <div className="kuiAccordian__childWrapper"  ref={node => { this.childWrapper = node; }}>
          <div ref={node => { this.childContent = node; }}>
            {children}
          </div>
        </div>
      </div>
    );
  }
}

KuiAccordian.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  buttonContentClassName: PropTypes.string,
  buttonContent: PropTypes.node,
};

KuiAccordian.defaultProps = {
  buttonContent: <div>Click to open. Replace me with the buttonContent prop.</div>,
  children: <div>Opened content. Replace me by adding chrildren to this component.</div>,
};
