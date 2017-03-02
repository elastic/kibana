import React from 'react';
import classNames from 'classnames';

import { KuiButton } from './button';

const KuiBasicButton = props => {
  const classes = classNames('kuiButton--basic', props.classes);

  const extendedProps = Object.assign({}, props, {
    classes,
  });

  return (
    <KuiButton {...extendedProps} />
  );
};

KuiBasicButton.propTypes = Object.assign({}, KuiButton.propTypes);

export { KuiBasicButton };
