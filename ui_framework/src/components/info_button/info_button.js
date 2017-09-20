import PropTypes from 'prop-types';
import React from 'react';

import classNames from 'classnames';

const KuiInfoButton = props => {
  const iconClasses = classNames('kuiInfoButton', props.className);

  const ariaLabel = props['aria-label'] || 'Info';
  return (
    <button className={iconClasses} aria-label={ariaLabel} {...props}>
      <span className="kuiIcon fa-info-circle" />
    </button>
  );
};

KuiInfoButton.propTypes = {
  'aria-label': PropTypes.string,
  className: PropTypes.string,
};

export {
  KuiInfoButton,
};
