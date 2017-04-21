import React from 'react';

export function KuiModalHeader({ children, ...rest }) {
  return (
    <div className="kuiModalHeader" { ...rest }>
      { children }
    </div>
  );
}

KuiModalHeader.propTypes = {
  className: React.PropTypes.string,
  children: React.PropTypes.node
};
