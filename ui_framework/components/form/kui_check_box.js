import React from 'react';

export function KuiCheckBox({ onChange, isChecked }) {

  return <input
      type="checkbox"
      className="kuiCheckBox"
      onChange={onChange}
      checked={isChecked}
  />;
}

KuiCheckBox.propTypes = {
  onChange: React.PropTypes.func,
  isChecked: React.PropTypes.bool
};
