/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export function SloGroupListEmpty() {
  return (
    <EuiCallOut
      data-test-subj="sloGroupListEmpty"
      title={i18n.translate('xpack.slo.groupList.emptyTitle', {
        defaultMessage: 'No SLO group results',
      })}
      color="warning"
      iconType="warning"
    >
      {i18n.translate('xpack.slo.groupList.emptyMessage', {
        defaultMessage: 'There are no results for your criteria.',
      })}
    </EuiCallOut>
  );
}
