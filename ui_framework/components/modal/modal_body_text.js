import React from 'react';

export function KuiModalBodyText({ children, ...rest }) {
  return (
    <div className="kuiModalBodyText" { ...rest }>
      { children }
    </div>
  );
}

KuiModalBodyText.propTypes = {
  className: React.PropTypes.string,
  children: React.PropTypes.node
};
