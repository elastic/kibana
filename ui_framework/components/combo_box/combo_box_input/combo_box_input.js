import React from 'react';

export const KuiComboBoxInput = ({
  onChange,
  type,
  value,
}) => {

  return (
    <input
      data-test-subj="comboBoxInput"
      className='kuiComboBoxInput'
      type={type}
      onChange={onChange}
      value={value}
    />
  );
};

KuiComboBoxInput.defaultProps = {
  type: 'text',
};
