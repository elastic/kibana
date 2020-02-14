/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useContext } from 'react';
import { useHistory } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiToolTip } from '@elastic/eui';

import {
  createCapabilityFailureMessage,
  AuthorizationContext,
} from '../../../../lib/authorization';

import { TransformListRow } from '../../../../common';

import { CLIENT_BASE_PATH, SECTION_SLUG } from '../../../../constants';

interface CloneActionProps {
  item: TransformListRow;
}

export const CloneAction: FC<CloneActionProps> = ({ item }) => {
  const history = useHistory();

  const { canCreateTransform } = useContext(AuthorizationContext).capabilities;

  const buttonCloneText = i18n.translate('xpack.transform.transformList.cloneActionName', {
    defaultMessage: 'Clone',
  });

  function clickHandler() {
    history.push(`${CLIENT_BASE_PATH}/${SECTION_SLUG.CLONE_TRANSFORM}/${item.id}`);
  }

  const cloneButton = (
    <EuiButtonEmpty
      size="xs"
      color="text"
      disabled={!canCreateTransform}
      iconType="copy"
      onClick={clickHandler}
      aria-label={buttonCloneText}
    >
      {buttonCloneText}
    </EuiButtonEmpty>
  );

  if (!canCreateTransform) {
    const content = createCapabilityFailureMessage('canStartStopTransform');

    return (
      <EuiToolTip position="top" content={content}>
        {cloneButton}
      </EuiToolTip>
    );
  }

  return <>{cloneButton}</>;
};
