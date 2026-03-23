/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { ToggleField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import * as i18n from '../create/translations';

interface Props {
  /**
   * Whether the component is loading
   */
  isLoading: boolean;
  /**
   * The default value of the toggle
   */
  defaultValue?: boolean;
}

/**
 * This component is used to toggle the extract observables feature in the create case flyout.
 */
const ObservablesToggleComponent: React.FC<Props> = ({ isLoading, defaultValue = true }) => {
  return (
    <UseField
      path="extractObservables"
      component={ToggleField}
      config={{ defaultValue }}
      componentProps={{
        idAria: 'caseObservablesToggle',
        'data-test-subj': 'caseObservablesToggle',
        euiFieldProps: {
          disabled: isLoading,
          label: i18n.EXTRACT_OBSERVABLES_LABEL,
        },
      }}
    />
  );
};

ObservablesToggleComponent.displayName = 'ObservablesToggleComponent';

export const ObservablesToggle = memo(ObservablesToggleComponent);
