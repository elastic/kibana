import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';

export const KuiHeaderBreadcrumb = ({
  href,
  isActive,
  children,
  className,
  ...rest,
}) => {
  const classes = classNames('kuiHeaderBreadcrumb', className, {
    'kuiHeaderBreadcrumb-isActive': isActive,
  });

  if (isActive) {
    return (
      <div
        className={classes}
        {...rest}
      >
        <div className="kuiHeaderBreadcrumb__text">
          {children}
        </div>
      </div>
    );
  }

  return (
    <a
      href={href}
      className={classes}
      {...rest}
    >
      <div className="kuiHeaderBreadcrumb__text">
        {children}
      </div>
    </a>
  );
};

KuiHeaderBreadcrumb.propTypes = {
  href: PropTypes.string,
  children: PropTypes.node,
  isActive: PropTypes.bool,
};
