/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText } from '@elastic/eui';
import React from 'react';

import * as i18n from '../../common/translations';

export const OptionalFieldLabel = (
  <EuiText color="subdued" size="xs" data-test-subj="form-optional-field-label">
    {i18n.OPTIONAL}
  </EuiText>
);

export const RequiredOnCloseFieldLabel = (
  <EuiText color="subdued" size="xs" data-test-subj="form-required-on-close-field-label">
    {i18n.REQUIRED_ON_CLOSE}
  </EuiText>
);

/**
 * The label append node for a template/case field, given its requirement state:
 * - required now → no append (the field is already marked required)
 * - required only on close → "Required on close" (accurate: fillable now, mandatory before closing)
 * - otherwise → "Optional"
 */
export const getFieldRequirementLabel = (
  isRequired?: boolean,
  isRequiredOnClose?: boolean
): React.ReactNode => {
  if (isRequired) {
    return undefined;
  }
  return isRequiredOnClose ? RequiredOnCloseFieldLabel : OptionalFieldLabel;
};
