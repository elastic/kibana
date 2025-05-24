import React from 'react';
import { EuiFormLabel, EuiFormRow, EuiFormRowProps } from '@elastic/eui';
import { css } from '@emotion/css';

const styles = {
  label: css({
    minWidth: 96,
  }),
};

type FormRowProps = EuiFormRowProps & { isInline?: boolean };

export const FormRow = ({ children, label, isInline, ...props }: FormRowProps) => {
  return !isInline ? (
    <EuiFormRow {...props} label={label}>
      {children}
    </EuiFormRow>
  ) : (
    <div data-test-subj={props['data-test-subj']}>
      {React.cloneElement(children, {
        prepend: <EuiFormLabel className={styles.label}>{label}</EuiFormLabel>,
      })}
    </div>
  );
};
