/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import { EuiToolTip } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { createNoStatsTooltipMessage } from '../../../../../../common/utils/create_stats_unknown_message';
import { missingTransformStats } from '../../../../common/transform_list';
import type { TransformCapabilities } from '../../../../../../common/types/capabilities';
import type { TransformState } from '../../../../../../common/constants';
import { TRANSFORM_STATE } from '../../../../../../common/constants';
import { createCapabilityFailureMessage } from '../../../../../../common/utils/create_capability_failure_message';

import type { TransformListRow } from '../../../../common';

export const resetActionNameText = i18n.translate(
  'xpack.transform.transformList.resetActionNameText',
  {
    defaultMessage: 'Reset',
  }
);

const transformCanNotBeReseted = (i: TransformListRow) =>
  i.stats &&
  !([TRANSFORM_STATE.STOPPED, TRANSFORM_STATE.FAILED] as TransformState[]).includes(i.stats.state);

export const isResetActionDisabled = (items: TransformListRow[], forceDisable: boolean) => {
  const disabled = items.some(transformCanNotBeReseted);

  return forceDisable === true || disabled || missingTransformStats(items);
};

export const getResetActionDisabledMessage = ({
  items,
  canResetTransform,
  forceDisable,
}: {
  items: TransformListRow[];
  canResetTransform: TransformCapabilities['canResetTransform'];
  forceDisable: boolean;
}) => {
  const isBulkAction = items.length > 1;

  if (missingTransformStats(items)) {
    return createNoStatsTooltipMessage({
      actionName: resetActionNameText,
      count: items.length,
    });
  }

  if (!canResetTransform) {
    return createCapabilityFailureMessage('canResetTransform');
  }

  if (isResetActionDisabled(items, forceDisable)) {
    const bulkResetButtonDisabledText = i18n.translate(
      'xpack.transform.transformList.resetBulkActionDisabledToolTipContent',
      {
        defaultMessage: 'One or more selected transforms must be stopped to be reset.',
      }
    );
    const resetButtonDisabledText = i18n.translate(
      'xpack.transform.transformList.resetActionDisabledToolTipContent',
      {
        defaultMessage: 'Stop the transform in order to reset it.',
      }
    );

    return isBulkAction ? bulkResetButtonDisabledText : resetButtonDisabledText;
  }
};
export interface ResetActionNameProps {
  items: TransformListRow[];

  canResetTransform: boolean;
  disabled: boolean;
  isBulkAction: boolean;
}

export const ResetActionName: FC<ResetActionNameProps> = ({
  items,
  canResetTransform,
  disabled,
}) => {
  const content = getResetActionDisabledMessage({
    items,
    canResetTransform,
    forceDisable: disabled,
  });

  if (content) {
    return (
      <EuiToolTip position="top" content={content}>
        <>{resetActionNameText}</>
      </EuiToolTip>
    );
  }

  return <>{resetActionNameText}</>;
};
