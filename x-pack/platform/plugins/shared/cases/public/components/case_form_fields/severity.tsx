/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow } from '@elastic/eui';
import React, { memo } from 'react';
import {
  getFieldValidityAndErrorMessage,
  UseField,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { isEmpty } from 'lodash';
import { CaseSeverity } from '../../../common/types/domain';
import { SeveritySelector } from '../severity/selector';
import { SEVERITY_TITLE } from '../severity/translations';

interface Props {
  isLoading: boolean;
}

const SeverityComponent: React.FC<Props> = ({ isLoading }) => (
  <UseField<CaseSeverity>
    path={'severity'}
    componentProps={{
      isLoading,
    }}
  >
    {(field) => {
      const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);

      const onChange = (newSeverity: CaseSeverity) => {
        field.setValue(newSeverity);
      };

      return (
        <EuiFormRow
          data-test-subj="caseSeverity"
          fullWidth
          label={SEVERITY_TITLE}
          error={errorMessage}
          isInvalid={isInvalid}
        >
          <SeveritySelector
            isLoading={isLoading}
            isDisabled={isLoading}
            selectedSeverity={isEmpty(field.value) ? CaseSeverity.LOW : field.value}
            onSeverityChange={onChange}
          />
        </EuiFormRow>
      );
    }}
  </UseField>
);

SeverityComponent.displayName = 'SeverityComponent';

export const Severity = memo(SeverityComponent);
