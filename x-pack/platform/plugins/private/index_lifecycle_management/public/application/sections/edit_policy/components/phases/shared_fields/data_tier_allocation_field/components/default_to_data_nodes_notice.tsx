/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { PhaseWithAllocation } from '../../../../../../../../../common/types';
import {
  noCustomAttributesTitle,
  nodeAllocationMigrationGuidance,
} from './no_custom_attributes_messages';

export const DefaultToDataNodesNotice: FunctionComponent<{ phase: PhaseWithAllocation }> = ({
  phase,
}) => {
  return (
    <EuiCallOut
      data-test-subj="defaultToDataNodesNotice"
      style={{ maxWidth: 400 }}
      title={noCustomAttributesTitle}
      color="primary"
    >
      <p>
        {i18n.translate(
          'xpack.indexLifecycleMgmt.warmPhase.dataTier.defaultToDataNodesDescription',
          { defaultMessage: 'Data will be allocated to any available data node.' }
        )}
      </p>

      {
        // @ts-expect-error Type '({ docLinks }: Props) => React.JSX.Element' is not assignable to type 'ReactNode'.
        nodeAllocationMigrationGuidance
      }
    </EuiCallOut>
  );
};
