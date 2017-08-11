import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';

export const KuiSelect = ({ className, options, id, name, ...rest }) => {
  const classes = classNames('kuiSelect', className);

  return (
    <select
      id={id}
      name={name}
      className={classes}
      {...rest}
    >
      {options.map(function (option, index) {
        return <option value={index} key={index}>{option}</option>;
      })}
    </select>
  );
};

KuiSelect.propTypes = {
  name: PropTypes.string.isRequired,
  id: PropTypes.string,
  options: PropTypes.array.isRequired,
};




