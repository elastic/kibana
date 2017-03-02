import React from 'react';
import classNames from 'classnames';

import { KuiButton } from './button';

const KuiDangerButton = props => {
  const classes = classNames('kuiButton--danger', props.classes);

  const extendedProps = Object.assign({}, props, {
    classes,
  });

  return (
    <KuiButton {...extendedProps} />
  );
};

KuiDangerButton.propTypes = Object.assign({}, KuiButton.propTypes);

export { KuiDangerButton };
