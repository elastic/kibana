import React from 'react';
import classNames from 'classnames';

import { KuiButton } from './button';

const KuiPrimaryButton = props => {
  const classes = classNames('kuiButton--primary', props.classes);

  const extendedProps = Object.assign({}, props, {
    classes,
  });

  return (
    <KuiButton {...extendedProps} />
  );
};

KuiPrimaryButton.propTypes = Object.assign({}, KuiButton.propTypes);

export { KuiPrimaryButton };
