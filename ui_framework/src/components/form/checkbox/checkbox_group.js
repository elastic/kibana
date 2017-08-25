import React from 'react';
import PropTypes from 'prop-types';

import { KuiCheckbox } from './checkbox';

export const KuiCheckboxGroup = ({
  options,
  idToSelectedMap,
  onChange,
  className,
  ...rest,
}) => (
  <div className={className} {...rest}>
    {options.map((option, index) => {
      return (
        <KuiCheckbox
          className="kuiCheckboxGroup__item"
          key={index}
          id={option.id}
          checked={idToSelectedMap[option.id]}
          label={option.label}
          onChange={onChange.bind(null, option.id)}
        />
      );
    })}
  </div>
);

KuiCheckboxGroup.propTypes = {
  options: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      label: PropTypes.string,
    }),
  ).isRequired,
  idToSelectedMap: PropTypes.objectOf(PropTypes.bool).isRequired,
  onChange: PropTypes.func.isRequired,
};

KuiCheckboxGroup.defaultProps = {
  options: [],
  idToSelectedMap: {},
};
