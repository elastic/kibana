import React from 'react';
import PropTypes from 'prop-types';

export const KuiComboBoxDropdown = ({
  children,
   ...rest
}) => {
  return (
    <div
      data-test-subj="comboBoxDropdown"
      className='kuiComboBoxDropdown'
      {...rest}
    >
      <div className="kuiComboBoxDropdown__content">
        {children}
      </div>
    </div>
  );
};

KuiComboBoxDropdown.propTypes = {
  children: PropTypes.node,
};
