import React from 'react';

export function KuiToolBarSearchBox({ filter, onFilter }) {
  return <div className="kuiToolBarSearch">
    <div className="kuiToolBarSearchBox">
      <div className="kuiToolBarSearchBox__icon kuiIcon fa-search"></div>
      <input
        className="kuiToolBarSearchBox__input"
        type="text"
        placeholder="Search..."
        aria-label="Filter"
        defaultValue={ filter }
        onChange={ (event) => onFilter(event.target.value) }/>
    </div>
  </div>;
}

KuiToolBarSearchBox.propTypes = {
  filter: React.PropTypes.string,
  onFilter: React.PropTypes.func.isRequired
};
