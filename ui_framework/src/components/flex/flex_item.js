import React from 'react';
import PropTypes from 'prop-types';

export const KuiFlexItem = ({ children, ...rest }) => {

  // This component on purpose does not accept a classname prop.
  return (
    <div
      className="kuiFlexItem"
      {...rest}
    >
      {children}
    </div>
  );
};

KuiFlexItem.propTypes = {
  children: PropTypes.node,
};
