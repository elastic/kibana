import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';
import { KuiCallOut } from '../../../components';

export const KuiForm = ({
  children,
  className,
  isInvalid,
  error,
  ...rest,
}) => {
  const classes = classNames('kuiForm', className);

  let optionalErrors;

  if (error) {
    const errorTexts = Array.isArray(error) ? error : [error];
    optionalErrors = (
      <ul>
        {errorTexts.map(error => (
          <li className="kuiForm__error" key={error}>
            {error}
          </li>
        ))}
      </ul>
    );
  }

  let optionalErrorAlert;

  if (isInvalid) {
    optionalErrorAlert = (
      <KuiCallOut
        className="kuiForm__errors"
        title="Please address the errors in your form."
        type="danger"
      >
        {optionalErrors}
      </KuiCallOut>
    );
  }

  return (
    <div
      className={classes}
      {...rest}
    >
      {optionalErrorAlert}
      {children}
    </div>
  );
};

KuiForm.propTypes = {
  isInvalid: PropTypes.bool,
  error: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]),
};
