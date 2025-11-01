/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { EuiFormRow, EuiSwitch, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

interface InterimResultsControlProps {
  value: boolean;
  onChange: (update: boolean) => void;
  disabled?: boolean;
}

export const InterimResultsControl: FC<InterimResultsControlProps> = React.memo(
  ({ value, onChange, disabled }) => {
    const switchComponent = (
      <EuiSwitch
        data-test-subj="mlAnomalyAlertIncludeInterimSwitch"
        label={
          <FormattedMessage
            id="xpack.ml.interimResultsControl.label"
            defaultMessage="Include interim results"
          />
        }
        checked={value ?? false}
        onChange={onChange.bind(null, !value)}
        disabled={disabled}
      />
    );

    return (
      <EuiFormRow>
        {disabled ? (
          <EuiToolTip
            content={i18n.translate('xpack.ml.interimResultsControl.disabledTooltip', {
              defaultMessage:
                'This control is disabled because the anomaly filter includes an is_interim condition.',
            })}
          >
            {switchComponent}
          </EuiToolTip>
        ) : (
          switchComponent
        )}
      </EuiFormRow>
    );
  }
);
