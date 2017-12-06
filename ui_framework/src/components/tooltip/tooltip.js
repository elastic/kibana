import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { SIZE } from './tooltip_constants';

export class KuiTooltip extends React.PureComponent {
  static propTypes = {
    isVisible: PropTypes.bool,
    size: PropTypes.oneOf([SIZE.AUTO, SIZE.SMALL, SIZE.MEDIUM, SIZE.LARGE]),
    isSticky: PropTypes.bool,
    title: PropTypes.string
  };

  static defaultProps = {
    isVisible: true,
    size: SIZE.AUTO,
    isSticky: false
  };

  render() {
    const {
      isSticky,
      isVisible,
      size,
      title,
      className,
      children,
      ...others
    } = this.props;

    const newClasses = classnames('tooltip-container', {
      'tooltip-container-visible': isVisible,
      'tooltip-container-hidden': !isVisible,
      'tooltip-hoverable': isSticky,
      [`tooltip-${size}`]: size !== 'auto'
    }, className);

    let tooltipTitle;
    if (title) {
      tooltipTitle = (
        <div>{title}</div>
      );
    }

    return (
      <div className={newClasses} {...others}>
        <div className="tooltip-content">
          {tooltipTitle}
          {children}
        </div>
      </div>
    );
  }
}
