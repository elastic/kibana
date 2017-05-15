import React, {
  PropTypes,
} from 'react';

import classNames from 'classnames';

const KuiInfoButton = props => {
  const iconClasses = classNames('kuiInfoButton kuiIcon fa-info-circle', props.className);

  return (
    <button className={iconClasses}></button>
  );
};

KuiInfoButton.propTypes = {
  className: PropTypes.string,
};

export {
  KuiInfoButton,
};
