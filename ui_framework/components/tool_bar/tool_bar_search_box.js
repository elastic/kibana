import React from 'react';
import classNames from 'classnames';

export function KuiToolBarSearchBox({ filter, onFilter, className, ...rest }) {
  function onChange(event) {
    onFilter(event.target.value);
  }
  const classes = classNames('kuiToolBarSearch', className);
  return <div className={ classes } { ...rest } >
    <div className="kuiToolBarSearchBox">
      <div className="kuiToolBarSearchBox__icon kuiIcon fa-search"></div>
      <input
        className="kuiToolBarSearchBox__input"
        type="text"
        placeholder="Search..."
        aria-label="Filter"
        defaultValue={ filter }
        onChange={ onChange }
      />
    </div>
  </div>;
}

KuiToolBarSearchBox.propTypes = {
  filter: React.PropTypes.string,
  onFilter: React.PropTypes.func.isRequired
};
