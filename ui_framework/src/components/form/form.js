import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';
import { KuiCallOut } from '../../../components';

export const KuiForm = ({ children, className, invalid, errors, ...rest }) => {
  const classes = classNames('kuiForm', className);



  let optionalErrors = null;
  if (errors) {
    optionalErrors = (
      <ul>
        {errors.map(function (error, index) {
          return <li className="kuiForm__error" key={index}>{error}</li>;
        })}
      </ul>
    );
  }

  let optionalErrorAlert = null;
  if (invalid) {
    optionalErrorAlert = (
      <KuiCallOut className="kuiForm__errors" title="Please address the errors in your form." type="danger">
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
  invalid: PropTypes.bool,
  errors: PropTypes.array,
};
