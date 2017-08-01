import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';
// import { KuiLoading, KuiLoadingChart, KuiLoadingSpinner } from '../../components';

const typeToClassNameMap = {
  chart: 'chart',
  logo: 'logo',
  spinner: 'spinner',
};

export const TYPES = Object.keys(typeToClassNameMap);


export const KuiLoadingMessage = ({ children, type, className, ...rest }) => {
  const classes = classNames(
    'kuiLoadingMessage',
    typeToClassNameMap[type],
    className
  );

  return (
    <div
      className={classes}
      {...rest}
    >
      {children}
    </div>
  );
};

KuiLoadingMessage.propTypes = {
  type: PropTypes.oneOf(TYPES),
};
