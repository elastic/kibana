import React, {
  PropTypes,
} from 'react';

import classNames from 'classnames';

const KuiInfoButton = props => {
  const iconClasses = classNames('kuiInfoButton', props.className);

  return (
    <button className={iconClasses} {...props}>
      <span className='kuiIcon fa-info-circle'></span>
    </button>
  );
};

KuiInfoButton.propTypes = {
  className: PropTypes.string,
};

export {
  KuiInfoButton,
};
