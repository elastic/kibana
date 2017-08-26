import React, {
  cloneElement,
  Component,
  PropTypes,
} from 'react';
import classNames from 'classnames';

import { KuiFormHelpText } from '../form_help_text';
import { KuiFormErrorText } from '../form_error_text';
import { KuiFormLabel } from '../form_label';

export class KuiFormRow extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isFocused: false,
    };

    this.onFocus = this.onFocus.bind(this);
    this.onBlur = this.onBlur.bind(this);
  }

  onFocus() {
    this.setState({
      isFocused: true,
    });
  }

  onBlur() {
    this.setState({
      isFocused: false,
    });
  }

  render() {
    const {
      children,
      helpText,
      isInvalid,
      error,
      label,
      id,
      hasEmptyLabelSpace,
      className,
      ...rest,
    } = this.props;

    const classes = classNames(
      'kuiFormRow',
      {
        'kuiFormRow--hasEmptyLabelSpace': hasEmptyLabelSpace,
      },
      className
    );

    let optionalHelpText;

    if (helpText) {
      optionalHelpText = (
        <KuiFormHelpText className="kuiFormRow__text">
          {helpText}
        </KuiFormHelpText>
      );
    }

    let optionalErrors;

    if (error) {
      const errorTexts = Array.isArray(error) ? error : [error];
      optionalErrors = errorTexts.map(error => (
        <KuiFormErrorText key={error} className="kuiFormRow__text">
          {error}
        </KuiFormErrorText>
      ));
    }

    let optionalLabel;

    if (label) {
      optionalLabel = (
        <KuiFormLabel
          isFocused={this.state.isFocused}
          isInvalid={isInvalid}
          htmlFor={id}
        >
          {label}
        </KuiFormLabel>
      );
    }

    const field = cloneElement(children, {
      id,
      onFocus: this.onFocus,
      onBlur: this.onBlur,
    });

    return (
      <div
        className={classes}
        {...rest}
      >
        {optionalLabel}
        {field}
        {optionalErrors}
        {optionalHelpText}
      </div>
    );
  }
}

KuiFormRow.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  label: PropTypes.string,
  id: PropTypes.string,
  isInvalid: PropTypes.bool,
  error: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]),
  helpText: PropTypes.string,
  hasEmptyLabelSpace: PropTypes.bool,
};

KuiFormRow.defaultProps = {
  hasEmptyLabelSpace: false,
};
