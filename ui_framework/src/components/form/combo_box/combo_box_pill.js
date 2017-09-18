import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import {
  KuiIcon,
} from '../../../components';

export const KuiComboBoxPill = ({
  children,
  className,
  ...rest,
}) => {
  const classes = classNames('kuiComboBoxPill', className);

  return (
    <div
      className={classes}
      {...rest}
    >
      {children}
      <button className="kuiComboBoxPill__close">
        <KuiIcon type="cross" className="kuiComboBoxPill__closeIcon" />
      </button>
    </div>
  );
};

KuiComboBoxPill.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};
