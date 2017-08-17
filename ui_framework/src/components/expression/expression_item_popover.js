import React,{ cloneElement } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

const POPOVER_ALIGN = [
  'left',
  'right',
];

class KuiOutsideClickDetector2 extends React.Component {
  static propTypes = {
    children: PropTypes.node.isRequired,
    onOutsideClick: PropTypes.func.isRequired,
  }

  onClickOutside = event => {
    if (!this.wrapperRef) {
      return;
    }

    if (this.wrapperRef === event.target) {
      return;
    }

    if (this.wrapperRef.contains(event.target)) {
      return;
    }

    this.props.onOutsideClick();
  }

  componentDidMount() {
    document.addEventListener('click', this.onClickOutside);
  }

  componentWillUnmount() {
    document.removeEventListener('click', this.onClickOutside);
  }

  render() {
    return cloneElement(this.props.children, {
      ref: node => {
        this.wrapperRef = node;
      }
    });
  }
 }

const KuiExpressionItemPopover = ({
  className,
  title,
  isVisible,
  children,
  align,
  onOutsideClick,
  ...rest
}) => {
  const classes = classNames('kuiExpressionItem__popover', className, {
    'kuiExpressionItem__popover--isHidden': !isVisible,
    'kuiExpressionItem__popover--alignRight': align === 'right'
  });
  return (
    <KuiOutsideClickDetector2 onOutsideClick={onOutsideClick}>
      <div
        className={classes}
        {...rest}
      >
        <div className="kuiExpressionItem__popoverTitle">
          {title}
        </div>
        <div className="kuiExpressionItem__popoverContent">
          {children}
        </div>
      </div>
    </KuiOutsideClickDetector2>
  );
};

KuiExpressionItemPopover.defaultProps = {
  align: 'left',
};

KuiExpressionItemPopover.propTypes = {
  className: PropTypes.string,
  title: PropTypes.string.isRequired,
  isVisible: PropTypes.bool.isRequired,
  children: PropTypes.node,
  align: PropTypes.oneOf(POPOVER_ALIGN),
  onOutsideClick: PropTypes.func.isRequired,
};

export {
  POPOVER_ALIGN,
  KuiExpressionItemPopover
};
