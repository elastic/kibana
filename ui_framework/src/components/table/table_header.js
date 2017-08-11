import React from 'react';
import PropTypes from 'prop-types';

export const KuiTableHeader = ({ children, className, ...rest }) => {
  return (
    <thead className={className} {...rest}>
      <tr>{ children }</tr>
    </thead>
  );
};
KuiTableHeader.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};
