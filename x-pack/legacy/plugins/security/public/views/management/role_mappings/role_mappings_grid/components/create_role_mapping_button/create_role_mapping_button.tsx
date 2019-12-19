/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { EDIT_ROLE_MAPPING_PATH } from '../../../../management_urls';

export const CreateRoleMappingButton = () => {
  return (
    <EuiButton
      data-test-subj="createRoleMappingButton"
      onClick={() => (window.location.hash = EDIT_ROLE_MAPPING_PATH)}
      fill
    >
      <FormattedMessage
        id="xpack.security.management.roleMappings.createRoleMappingButton"
        defaultMessage="Create role mapping"
      />
    </EuiButton>
  );
};
