import React from 'react';

export function KuiModalOverlay(props) {
  return (
    <div className="kuiModalOverlay"
         data-test-subj="modalOverlay"
         { ...props}
    />
  );
}

KuiModalOverlay.propTypes = {
  className: React.PropTypes.string,
};
