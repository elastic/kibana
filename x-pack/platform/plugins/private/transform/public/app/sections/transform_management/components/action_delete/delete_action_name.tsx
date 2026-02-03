/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import { i18n } from '@kbn/i18n';

import { EuiToolTip } from '@elastic/eui';

import { missingTransformStats } from '../../../../common/transform_list';
import { createNoStatsTooltipMessage } from '../../../../../../common/utils/create_stats_unknown_message';
import type { TransformCapabilities } from '../../../../../../common/types/capabilities';
import type { TransformListRow } from '../../../../common';
import { createCapabilityFailureMessage } from '../../../../../../common/utils/create_capability_failure_message';
import type { TransformState } from '../../../../../../common/constants';
import { TRANSFORM_STATE } from '../../../../../../common/constants';
import { isManagedTransform } from '../../../../common/managed_transforms_utils';

export const deleteActionNameText = i18n.translate(
  'xpack.transform.transformList.deleteActionNameText',
  {
    defaultMessage: 'Delete',
  }
);

const transformCanNotBeDeleted = (i: TransformListRow) =>
  i.stats &&
  !([TRANSFORM_STATE.STOPPED, TRANSFORM_STATE.FAILED] as TransformState[]).includes(i.stats.state);

export const isDeleteActionDisabled = (items: TransformListRow[], forceDisable: boolean) => {
  const disabled = items.some(transformCanNotBeDeleted);
  const hasManagedTransforms = items.some((item) => isManagedTransform(item));

  return forceDisable || disabled || missingTransformStats(items) || hasManagedTransforms;
};

export interface DeleteActionNameProps {
  items: TransformListRow[];
  canDeleteTransform: boolean;
}

export const getDeleteActionDisabledMessage = ({
  items,
  canDeleteTransform,
}: {
  items: TransformListRow[];
  canDeleteTransform: TransformCapabilities['canDeleteTransform'];
}) => {
  const isBulkAction = items.length > 1;

  if (missingTransformStats(items)) {
    return createNoStatsTooltipMessage({
      actionName: deleteActionNameText,
      count: items.length,
    });
  }

  if (!canDeleteTransform) {
    return createCapabilityFailureMessage('canDeleteTransform');
  }

  const hasManagedTransforms = items.some((item) => isManagedTransform(item));
  if (hasManagedTransforms) {
    return isBulkAction
      ? i18n.translate(
          'xpack.transform.transformList.deleteManagedBulkActionDisabledToolTipContent',
          {
            defaultMessage:
              'Managed transforms cannot be deleted. They are preconfigured by Elastic and may impact other parts of the product.',
          }
        )
      : i18n.translate('xpack.transform.transformList.deleteManagedActionDisabledToolTipContent', {
          defaultMessage:
            'This transform cannot be deleted. It is preconfigured by Elastic and may impact other parts of the product.',
        });
  }

  const disabled = items.some(transformCanNotBeDeleted);

  if (disabled) {
    return isBulkAction
      ? i18n.translate('xpack.transform.transformList.deleteBulkActionDisabledToolTipContent', {
          defaultMessage: 'One or more selected transforms must be stopped in order to be deleted.',
        })
      : i18n.translate('xpack.transform.transformList.deleteActionDisabledToolTipContent', {
          defaultMessage: 'Stop the transform in order to delete it.',
        });
  }
};

export const DeleteActionName: FC<DeleteActionNameProps> = ({ items, canDeleteTransform }) => {
  const content = getDeleteActionDisabledMessage({ items, canDeleteTransform });

  if (content) {
    return (
      <EuiToolTip position="top" content={content}>
        <span tabIndex={0}>{deleteActionNameText}</span>
      </EuiToolTip>
    );
  }

  return <>{deleteActionNameText}</>;
};
