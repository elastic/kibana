import React from 'react';

export function KuiCheckBox({ onClick, isChecked }) {
  function onChange(event) {
    if (onClick) {
      onClick(event.target.checked);
    }
  }

  return <input
      type="checkbox"
      className="kuiCheckBox"
      onChange={onChange}
      checked={isChecked}
  />;
}

KuiCheckBox.propTypes = {
  onClick: React.PropTypes.func,
  isChecked: React.PropTypes.bool
};
