/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiText } from '@elastic/eui';
import { DottedKeyValueTable } from '../DottedKeyValueTable';
import { FlattenItems } from '../../../utils/flattenObject';

interface Props {
  items?: FlattenItems;
}

export function Section({ items }: Props) {
  if (items) {
    return <DottedKeyValueTable items={items} />;
  }
  return (
    <EuiText size="s">
      {i18n.translate(
        'xpack.apm.propertiesTable.agentFeature.noDataAvailableLabel',
        { defaultMessage: 'No data available' }
      )}
    </EuiText>
  );
}
