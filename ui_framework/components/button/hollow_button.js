import React from 'react';
import classNames from 'classnames';

import { KuiButton } from './button';

const KuiHollowButton = props => {
  const classes = classNames('kuiButton--hollow', props.classes);

  const extendedProps = Object.assign({}, props, {
    classes,
  });

  return (
    <KuiButton {...extendedProps} />
  );
};

KuiHollowButton.propTypes = Object.assign({}, KuiButton.propTypes);

export { KuiHollowButton };
