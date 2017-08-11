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
      {options.map((option, index) => {
        return <option value={option.value} key={index}>{option.text}</option>;
      })}
    </select>
  );
};

KuiSelect.propTypes = {
  name: PropTypes.string.isRequired,
  id: PropTypes.string,
  options: PropTypes.arrayOf(React.PropTypes.object).isRequired,
};
