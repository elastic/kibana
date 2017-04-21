import React from 'react';

export function KuiModal({ children, ...rest }) {
  return (
    <div className="kuiModal" { ...rest }>
      { children }
    </div>
  );
}

KuiModal.propTypes = {
  className: React.PropTypes.string,
  children: React.PropTypes.node
};
