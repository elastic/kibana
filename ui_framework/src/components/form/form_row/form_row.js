import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';
import { KuiIcon } from '../../../components';

export const KuiFormRow = ({ children, icon, helpText, label, id, className, ...rest }) => {
  const classes = classNames(
    'kuiFormRow',
    className,
    {
      'kuiFormRow--withIcon' : icon,
    }
  );

  let optionalIcon = null;
  if (icon) {
    optionalIcon = <KuiIcon className="kuiFormRow__icon" type={icon} size="medium" />;
  }

  let optionalHelpText = null;
  if (helpText) {
    optionalHelpText = <div className="kuiFormRow__helpText">{helpText}</div>;
  }

  let optionalLabel = null;
  if (label) {
    optionalLabel = <label className="kuiFormRow__label" htmlFor={id}>{label}</label>;
  }

  return (
    <div
      className={classes}
      {...rest}
    >
      {/*
          Order is important here. The label needs to be UNDER the children.
          We rearrange the flex order in the CSS so the label ends up
          displaying above the children / input. This allows us to still
          use sibling selectors against the label that are tiggered by the
          focus state of the input.
      */}
      {children}
      {optionalLabel}
      {optionalHelpText}
      {optionalIcon}
    </div>
  );
};

KuiFormRow.propTypes = {
  label: PropTypes.string,
  id: PropTypes.string,
  icon: PropTypes.string,
  helpText: PropTypes.string,
};
