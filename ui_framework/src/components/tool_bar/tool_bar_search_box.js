import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';

export function KuiToolBarSearchBox({ defaultValue, filter, onFilter, placeholder, className, ...rest }) {
  function onChange(event) {
    onFilter(event.target.value);
  }
  const classes = classNames('kuiToolBarSearch', className);
  return (
    <div
      className={classes}
      {...rest}
    >
      <div className="kuiToolBarSearchBox">
        <div className="kuiToolBarSearchBox__icon kuiIcon fa-search" />
        <input
          defaultValue={defaultValue}
          className="kuiToolBarSearchBox__input"
          type="text"
          placeholder={placeholder}
          aria-label="Filter"
          value={filter}
          onChange={onChange}
        />
      </div>
    </div>
  );
}

KuiToolBarSearchBox.propTypes = {
  defaultValue: PropTypes.string,
  filter: PropTypes.string,
  onFilter: PropTypes.func.isRequired
};

KuiToolBarSearchBox.defaultProps = {
  placeholder: 'Search...'
};
