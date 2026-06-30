/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React from 'react';
import { EuiTextColor } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

/**
 * Appends a red asterisk to a form label to indicate the field is required.
 * Wrap any EuiFormRow `label` with this when the field has a required validation rule.
 */
export function requiredLabel(label: ReactNode): ReactNode {
  return (
    <>
      {label}{' '}
      <EuiTextColor color="danger">
        <span
          aria-label={i18n.translate('xpack.dataFederation.requiredLabel.ariaLabel', {
            defaultMessage: 'Required',
          })}
        >
          *
        </span>
      </EuiTextColor>
    </>
  );
}
