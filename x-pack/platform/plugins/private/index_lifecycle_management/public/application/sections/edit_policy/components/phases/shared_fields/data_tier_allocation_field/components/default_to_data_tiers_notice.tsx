/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useKibana } from '../../../../../../../../shared_imports';
import type { PhaseWithAllocation } from '../../../../../../../../../common/types';
import {
  noCustomAttributesTitle,
  nodeAllocationMigrationGuidance,
} from './no_custom_attributes_messages';

export const DefaultToDataTiersNotice: FunctionComponent<{ phase: PhaseWithAllocation }> = ({
  phase,
}) => {
  const {
    services: { docLinks },
  } = useKibana();

  const phaseTexts = {
    warm: i18n.translate(
      'xpack.indexLifecycleMgmt.warmPhase.dataTier.defaultAllocationNotAvailableDescription',
      { defaultMessage: 'Data will be allocated to the warm tier.' }
    ),
    cold: i18n.translate(
      'xpack.indexLifecycleMgmt.coldPhase.dataTier.defaultAllocationNotAvailableDescription',
      { defaultMessage: 'Data will be allocated to the cold tier.' }
    ),
  };

  return (
    <EuiCallOut
      data-test-subj="defaultToDataTiersNotice"
      style={{ maxWidth: 400 }}
      title={noCustomAttributesTitle}
      color="primary"
    >
      <p>{phaseTexts[phase]}</p>
      {nodeAllocationMigrationGuidance({ docLinks })}
    </EuiCallOut>
  );
};
