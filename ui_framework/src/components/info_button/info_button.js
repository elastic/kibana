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
  'aria-label': PropTypes.string,
  className: PropTypes.string,
};

KuiInfoButton.defaultProps = {
  'aria-label': 'Info'
};

export {
  KuiInfoButton,
};
