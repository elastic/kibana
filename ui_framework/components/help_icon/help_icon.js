import React, {
  PropTypes,
} from 'react';

import classNames from 'classnames';

const KuiHelpIcon = props => {
  const iconClasses = classNames('kuiHelpIcon kuiIcon fa-info-circle', props.className);

  return (
    <button className={iconClasses}></button>
  );
};

KuiHelpIcon.propTypes = {
  className: PropTypes.string,
};

export {
  KuiHelpIcon,
};
