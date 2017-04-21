import React from 'react';

export function KuiModalFooter({ children, ...rest }) {
  return (
    <div className="kuiModalFooter" { ...rest }>
      { children }
    </div>
  );
}

KuiModalFooter.propTypes = {
  className: React.PropTypes.string,
  children: React.PropTypes.node
};
