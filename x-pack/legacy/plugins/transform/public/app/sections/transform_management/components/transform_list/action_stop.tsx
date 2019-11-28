/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useContext } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiToolTip } from '@elastic/eui';

import { TransformListRow, TRANSFORM_STATE } from '../../../../common';
import {
  createCapabilityFailureMessage,
  AuthorizationContext,
} from '../../../../lib/authorization';
import { useStopTransforms } from '../../../../hooks';

interface StopActionProps {
  items: TransformListRow[];
  forceDisable?: boolean;
}

export const StopAction: FC<StopActionProps> = ({ items, forceDisable }) => {
  const isBulkAction = items.length > 1;
  const { canStartStopTransform } = useContext(AuthorizationContext).capabilities;
  const stopTransforms = useStopTransforms();
  const buttonStopText = i18n.translate('xpack.transform.transformList.stopActionName', {
    defaultMessage: 'Stop',
  });

  // Disable stop action if one of the transforms is stopped already
  const stoppedTransform = items.some(
    (i: TransformListRow) => i.stats.state === TRANSFORM_STATE.STOPPED
  );

  let stoppedTransformMessage;
  if (isBulkAction === true) {
    stoppedTransformMessage = i18n.translate(
      'xpack.transform.transformList.stoppedTransformBulkToolTip',
      {
        defaultMessage: 'One or more transforms are already stopped.',
      }
    );
  } else {
    stoppedTransformMessage = i18n.translate(
      'xpack.transform.transformList.stoppedTransformToolTip',
      {
        defaultMessage: '{transformId} is already stopped.',
        values: { transformId: items[0] && items[0].config.id },
      }
    );
  }

  const handleStop = () => {
    stopTransforms(items);
  };

  const stopButton = (
    <EuiButtonEmpty
      size="xs"
      color="text"
      disabled={forceDisable === true || !canStartStopTransform || stoppedTransform === true}
      iconType="stop"
      onClick={handleStop}
      aria-label={buttonStopText}
    >
      {buttonStopText}
    </EuiButtonEmpty>
  );
  if (!canStartStopTransform || stoppedTransform) {
    return (
      <EuiToolTip
        position="top"
        content={
          !canStartStopTransform
            ? createCapabilityFailureMessage('canStartStopTransform')
            : stoppedTransformMessage
        }
      >
        {stopButton}
      </EuiToolTip>
    );
  }

  return stopButton;
};
