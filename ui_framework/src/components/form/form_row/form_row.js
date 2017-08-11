import React, {
  cloneElement,
  PropTypes,
} from 'react';
import classNames from 'classnames';
import { KuiIcon } from '../../../components';

export const KuiFormRow = ({ children, icon, containsSelect, helpText, invalid, errors, label, id, className, ...rest }) => {
  const classes = classNames(
    'kuiFormRow',
    className,
    {
      'kuiFormRow--withIcon' : icon,
      'kuiFormRow--invalid' : invalid,
      'kuiFormRow--select' : containsSelect,
    }
  );

  let field;
  let optionalIcon = null;
  let optionalHelpText = null;
  let optionalErrors = null;
  let optionalLabel = null;

  if (icon) {
    optionalIcon = <KuiIcon className="kuiFormRow__icon" type={icon} size="medium" />;
  }

  if (helpText) {
    optionalHelpText = <div className="kuiFormRow__helpText">{helpText}</div>;
  }

  if (errors) {
    optionalErrors = (
      errors.map(function (error, index) {
        return <div  key={index} className="kuiFormRow__error">{error}</div>;
      })
    );
  }

  if (label) {
    optionalLabel = <label className="kuiFormRow__label" htmlFor={id}>{label}</label>;
  }

  if (id) {
    field = cloneElement(children, {
      id,
    });
  } else {
    field = children;
  }

  return (
    <div
      className={classes}
      {...rest}
    >
      {/*
          Order is important here. The label needs to be UNDER the field.
          We rearrange the flex order in the CSS so the label ends up
          displaying above the children / input. This allows us to still
          use sibling selectors against the label that are tiggered by the
          focus state of the input.
      */}
      {field}
      {optionalLabel}
      {optionalErrors}
      {optionalHelpText}
      {optionalIcon}
    </div>
  );
};

KuiFormRow.propTypes = {
  label: PropTypes.string,
  id: PropTypes.string,
  icon: PropTypes.string,
  invalid: PropTypes.bool,
  containsSelect: PropTypes.bool,
  errors: PropTypes.array,
  helpText: PropTypes.string,
};
