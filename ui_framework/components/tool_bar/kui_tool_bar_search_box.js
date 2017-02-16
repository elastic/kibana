import React from 'react';

export function KuiToolBarSearchBox({ filter, doFilter }) {
  return <div className="kuiToolBarSearch">
    <div className="kuiToolBarSearchBox">
      <div className="kuiToolBarSearchBox__icon kuiIcon fa-search"></div>
      <input
        className="kuiToolBarSearchBox__input"
        type="text"
        placeholder="Search..."
        aria-label="Filter"
        defaultValue={ filter }
        onChange={ (event) => doFilter(event.target.value) }/>
    </div>
  </div>;
}

KuiToolBarSearchBox.propTypes = {
  filter: React.PropTypes.string,
  doFilter: React.PropTypes.func.isRequired
};
