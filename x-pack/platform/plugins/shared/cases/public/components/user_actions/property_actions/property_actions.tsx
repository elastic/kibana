/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import React from 'react';
import type { AttachmentAction } from '../../../client/attachment_framework/types';
import { PropertyActions } from '../../property_actions';

interface Props {
  isLoading: boolean;
  propertyActions: AttachmentAction[];
  customDataTestSubj?: string;
  buttonRef?: React.Ref<HTMLAnchorElement>;
}

const UserActionPropertyActionsComponent: React.FC<Props> = ({
  isLoading,
  propertyActions,
  customDataTestSubj = 'user-action',
  buttonRef,
}) => {
  if (propertyActions.length === 0) {
    return null;
  }

  return (
    <EuiFlexItem grow={false}>
      {isLoading ? (
        <EuiLoadingSpinner data-test-subj="user-action-title-loading" />
      ) : (
        <PropertyActions
          propertyActions={propertyActions}
          customDataTestSubj={customDataTestSubj}
          buttonRef={buttonRef}
        />
      )}
    </EuiFlexItem>
  );
};

UserActionPropertyActionsComponent.displayName = 'UserActionPropertyActions';

export const UserActionPropertyActions = React.memo(UserActionPropertyActionsComponent);
