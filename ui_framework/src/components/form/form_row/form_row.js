import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';
import { KuiIcon } from '../../../components';

export const KuiFormRow = ({ children, icon, id, helpText, label, className, ...rest }) => {
  const classes = classNames(
    'kuiFormRow',
    className,
    {
      'kuiFormRow--withIcon' : icon,
    }
  );

  let optionalIcon = null;
  if (icon) {
    optionalIcon = <KuiIcon className="kuiFormRow__icon" type={icon} size="medium" />
  }

  let optionalHelpText = null;
  if (helpText) {
    optionalHelpText = <div className="kuiFormRow__helpText">{helpText}</div>;
  }

  let optionalLabel = null;
  if (label) {
    optionalLabel = <label htmlFor={id}>{label}</label>;
  }

  return (
    <div
      className={classes}
      {...rest}
    >
      {/* Order is important, a flex-direction: reverse is applied for style. */}
      {optionalIcon}
      {optionalHelpText}
      {children}
      {optionalLabel}
    </div>
  );
};

KuiFormRow.propTypes = {
};
