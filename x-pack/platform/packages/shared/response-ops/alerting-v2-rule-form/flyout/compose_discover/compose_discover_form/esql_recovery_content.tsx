/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useWatch } from 'react-hook-form';
import { EuiButton, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { CustomRecoveryRenderProps } from '../types';
import type { FormValues } from '../../../form/types';
import { QueryBlock } from '../query_summary';

const noBaseQueryDefined = i18n.translate(
  'xpack.alertingV2.composeDiscover.recoveryCondition.noBaseQueryDefined',
  { defaultMessage: 'No base query defined' }
);

const noRecoveryConditionDefined = i18n.translate(
  'xpack.alertingV2.composeDiscover.recoveryCondition.noRecoveryConditionDefined',
  { defaultMessage: 'No recovery condition defined' }
);

export const EsqlRecoveryContent: React.FC<CustomRecoveryRenderProps> = ({ state, dispatch }) => {
  const query = useWatch<FormValues, 'query'>({ name: 'query' });
  const baseQuery = query?.format === 'composed' ? query.base : '';
  const recoveryBlock = query?.format === 'composed' ? query.recovery?.segment ?? '' : '';

  return (
    <>
      <QueryBlock
        label={
          <FormattedMessage
            id="xpack.alertingV2.composeDiscover.recoveryCondition.baseQueryLabel"
            defaultMessage="Base query"
          />
        }
        query={baseQuery}
        emptyMessage={noBaseQueryDefined}
      />
      <EuiSpacer size="m" />
      <QueryBlock
        label={
          <FormattedMessage
            id="xpack.alertingV2.composeDiscover.recoveryCondition.recoveryConditionLabel"
            defaultMessage="Recovery condition"
          />
        }
        query={recoveryBlock}
        emptyMessage={noRecoveryConditionDefined}
      />
      <EuiSpacer size="s" />
      <EuiButton
        size="s"
        color="text"
        iconType="chevronLimitLeft"
        isDisabled={state.childOpen}
        onClick={() => dispatch({ type: 'OPEN_CHILD_FOR_STEP', step: state.step, isAlert: true })}
        data-test-subj="composeDiscoverEditRecovery"
      >
        <FormattedMessage
          id="xpack.alertingV2.composeDiscover.recoveryCondition.editRecoveryButtonLabel"
          defaultMessage="Edit recovery query"
        />
      </EuiButton>
    </>
  );
};
