/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { ToggleField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { CaseAccessMode } from '../../../common/types/domain';
import { useAccessControlClickedEBT } from '../../analytics/use_access_control_ebt';
import * as i18n from '../create/translations';

interface Props {
  isLoading: boolean;
}

const AccessToggleComponent: React.FC<Props> = ({ isLoading }) => {
  const reportAccessControlClicked = useAccessControlClickedEBT('create');

  const onToggle = useCallback(
    (restricted: unknown) => {
      reportAccessControlClicked(
        restricted === true ? CaseAccessMode.RESTRICTED : CaseAccessMode.DEFAULT
      );
    },
    [reportAccessControlClicked]
  );

  return (
    <UseField
      path="restricted"
      component={ToggleField}
      config={{ defaultValue: false, helpText: i18n.RESTRICTED_HELP }}
      onChange={onToggle}
      componentProps={{
        idAria: 'caseRestricted',
        'data-test-subj': 'caseRestricted',
        euiFieldProps: {
          disabled: isLoading,
          label: i18n.RESTRICTED_LABEL,
        },
      }}
    />
  );
};

AccessToggleComponent.displayName = 'AccessToggleComponent';

export const AccessToggle = memo(AccessToggleComponent);
