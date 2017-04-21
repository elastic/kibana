import React from 'react';

export function KuiModalBody({ children, ...rest }) {
  return (
    <div className="kuiModalBody" { ...rest }>
      { children }
    </div>
  );
}

KuiModalBody.propTypes = {
  className: React.PropTypes.string,
  children: React.PropTypes.node
};
