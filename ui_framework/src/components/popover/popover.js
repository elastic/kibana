import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

const anchorPositionToClassNameMap = {
  'center': '',
  'left': 'kuiPopover--anchorLeft',
  'right': 'kuiPopover--anchorRight',
};

export const ANCHOR_POSITIONS = Object.keys(anchorPositionToClassNameMap);

export class KuiPopover extends Component {
  constructor(props) {
    super(props);

    // Use this variable to differentiate between clicks on the element that should not cause the pop up
    // to close, and external clicks that should cause the pop up to close.
    this.didClickMyself = false;
  }

  closePopover = () => {
    if (this.didClickMyself) {
      this.didClickMyself = false;
      return;
    }

    this.props.closePopover();
  };

  onClickRootElement = () => {
    // This prevents clicking on the element from closing it, due to the event handler on the
    // document object.
    this.didClickMyself = true;
  };

  componentDidMount() {
    // When the user clicks somewhere outside of the color picker, we will dismiss it.
    document.addEventListener('click', this.closePopover);
  }

  componentWillUnmount() {
    document.removeEventListener('click', this.closePopover);
  }

  render() {
    const {
      anchorPosition,
      bodyClassName,
      button,
      isOpen,
      children,
      className,
      closePopover, // eslint-disable-line no-unused-vars
      ...rest,
    } = this.props;

    const classes = classNames(
      'kuiPopover',
      anchorPositionToClassNameMap[anchorPosition],
      className,
      {
        'kuiPopover-isOpen': isOpen,
      },
    );

    const bodyClasses = classNames('kuiPopover__body', bodyClassName);

    const body = (
      <div className={bodyClasses}>
        { children }
      </div>
    );

    return (
      <div
        onClick={this.onClickRootElement}
        className={classes}
        {...rest}
      >
        { button }
        { body }
      </div>
    );
  }
}

KuiPopover.propTypes = {
  isOpen: PropTypes.bool,
  closePopover: PropTypes.func.isRequired,
  button: PropTypes.node.isRequired,
  children: PropTypes.node,
  anchorPosition: PropTypes.oneOf(ANCHOR_POSITIONS),
  bodyClassName: PropTypes.string,
};

KuiPopover.defaultProps = {
  isOpen: false,
  anchorPosition: 'center',
};
