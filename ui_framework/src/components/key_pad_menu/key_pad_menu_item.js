import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';

const renderContent = (children, label) => (
  <div className="kuiKeyPadMenuItem__inner">
    <div className="kuiKeyPadMenuItem__icon">
      {children}
    </div>

    <p className="kuiKeyPadMenuItem__label">
      {label}
    </p>
  </div>
);

const commonPropTypes = {
  children: PropTypes.node.isRequired,
  label: PropTypes.string.isRequired,
};

export const KuiKeyPadMenuItem = ({ href, label, children, className, ...rest }) => {
  const classes = classNames('kuiKeyPadMenuItem', className);

  return (
    <a
      href={href}
      className={classes}
      {...rest}
    >
      {renderContent(children, label)}
    </a>
  );
};

KuiKeyPadMenuItem.propTypes = Object.assign({
  href: PropTypes.string,
}, commonPropTypes);

export const KuiKeyPadMenuItemButton = ({ onClick, label, children, className, ...rest }) => {
  const classes = classNames('kuiKeyPadMenuItem', className);

  return (
    <button
      onClick={onClick}
      className={classes}
      {...rest}
    >
      {renderContent(children, label)}
    </button>
  );
};

KuiKeyPadMenuItemButton.propTypes = Object.assign({
  onClick: PropTypes.func,
}, commonPropTypes);
