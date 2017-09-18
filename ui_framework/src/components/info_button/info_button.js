import PropTypes from 'prop-types';
import React from 'react';

import classNames from 'classnames';

const KuiInfoButton = props => {
  const iconClasses = classNames('kuiInfoButton', props.className);

  return (
    <button className={iconClasses} {...props}>
      <span className="kuiIcon fa-info-circle" />
    </button>
  );
};

KuiInfoButton.propTypes = {
  className: PropTypes.string,
};

export {
  KuiInfoButton,
};
