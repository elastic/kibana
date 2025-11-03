/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { FunctionComponent } from 'react';
import React from 'react';
import { EuiCallOut } from '@elastic/eui';

import type { PhaseWithAllocation } from '../../../../../../../../../common/types';

const i18nTexts = {
  warm: {
    title: i18n.translate('xpack.indexLifecycleMgmt.warmPhase.dataTier.noTiersAvailableTitle', {
      defaultMessage: 'No nodes assigned to the warm tier',
    }),
    body: i18n.translate('xpack.indexLifecycleMgmt.warmPhase.dataTier.noTiersAvailableBody', {
      defaultMessage:
        'To use role-based allocation, assign one or more nodes to the warm or hot tiers. Allocation will fail if there are no available nodes.',
    }),
  },
  cold: {
    title: i18n.translate('xpack.indexLifecycleMgmt.coldPhase.dataTier.noTiersAvailableTitle', {
      defaultMessage: 'No nodes assigned to the cold tier',
    }),
    body: i18n.translate('xpack.indexLifecycleMgmt.coldPhase.dataTier.noTiersAvailableBody', {
      defaultMessage:
        'To use role-based allocation, assign one or more nodes to the cold, warm, or hot tiers. Allocation will fail if there are no available nodes.',
    }),
  },
};

interface Props {
  phase: PhaseWithAllocation;
}

export const NoTiersAvailableNotice: FunctionComponent<Props> = ({ phase }) => {
  return (
    <EuiCallOut
      data-test-subj="noTiersAvailableNotice"
      title={i18nTexts[phase].title}
      color="warning"
    >
      {i18nTexts[phase].body}
    </EuiCallOut>
  );
};
