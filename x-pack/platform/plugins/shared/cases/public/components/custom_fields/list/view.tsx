/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiText } from '@elastic/eui';
import type {
  CaseCustomFieldList,
  ListCustomFieldConfiguration,
} from '../../../../common/types/domain';
import type { CustomFieldType } from '../types';

const ViewComponent: CustomFieldType<CaseCustomFieldList, ListCustomFieldConfiguration>['View'] = ({
  customField,
  configuration,
}) => {
  const selectedKey = customField?.value ? Object.keys(customField.value)[0] : null;
  const displayValue =
    configuration?.options.find((option) => option.key === selectedKey)?.label ?? '-';
  return (
    <EuiText
      className="eui-textBreakWord"
      data-test-subj={`list-custom-field-view-${customField?.key}`}
    >
      {displayValue}
    </EuiText>
  );
};

ViewComponent.displayName = 'View';

export const View = React.memo(ViewComponent);
