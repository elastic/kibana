/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFieldText } from '@elastic/eui';

export function StaticLabelSelector({ onChange, styleOptions }) {
  const onValueChange = event => {
    onChange({ value: event.target.value });
  };

  return (
    <EuiFieldText
      placeholder={i18n.translate('xpack.maps.styles.staticLabel.valuePlaceholder', {
        defaultMessage: 'symbol label',
      })}
      value={styleOptions.value}
      onChange={onValueChange}
      aria-label={i18n.translate('xpack.maps.styles.staticLabel.valueAriaLabel', {
        defaultMessage: 'symbol label',
      })}
    />
  );
}
