import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';

import {
  KuiIcon,
} from '../../../components';

export const KuiHeaderLogo = ({ href, className, ...rest }) => {
  const classes = classNames('kuiHeaderLogo', className);

  return (
    <a href={href} className={classes} {...rest}>
      <KuiIcon
        className="kuiHeaderLogo__icon"
        type="logoKibana"
        size="xLarge"
        title="Go to Kibana home page"
      />
    </a>
  );
};

KuiHeaderLogo.propTypes = {
  href: PropTypes.string,
};
