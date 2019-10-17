/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import { EuiText } from '@elastic/eui';
import { DottedKeyValueTable, PathifyResult } from '../DottedKeyValueTable';

interface Props {
  propData?: Record<string, unknown> | PathifyResult;
  propKey?: string;
}

export function Section({ propData = {}, propKey }: Props) {
  if (isEmpty(propData)) {
    return (
      <EuiText size="s">
        {i18n.translate(
          'xpack.apm.propertiesTable.agentFeature.noDataAvailableLabel',
          { defaultMessage: 'No data available' }
        )}
      </EuiText>
    );
  }
  return (
    <DottedKeyValueTable data={propData} skipPathify parentKey={propKey} />
  );
}
