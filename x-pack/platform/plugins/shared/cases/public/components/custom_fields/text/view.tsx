/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiText } from '@elastic/eui';
import type { CaseCustomFieldText } from '../../../../common/types/domain';
import type { CustomFieldType } from '../types';

const ViewComponent: CustomFieldType<CaseCustomFieldText>['View'] = ({ customField }) => {
  const value = customField?.value ?? '-';

  return (
    <EuiText
      className="eui-textBreakWord"
      data-test-subj={`text-custom-field-view-${customField?.key}`}
    >
      {value}
    </EuiText>
  );
};

ViewComponent.displayName = 'View';

export const View = React.memo(ViewComponent);
