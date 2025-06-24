/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CaseCallOut } from '../use_push_to_service/callout';
import type { ErrorMessage } from '../use_push_to_service/callout/types';

interface PushCalloutsProps {
  hasConnectors: boolean;
  hasLicenseError: boolean;
  errorsMsg: ErrorMessage[];
  onEditClick: () => void;
}

const PushCalloutsComponent: React.FC<PushCalloutsProps> = ({
  hasConnectors,
  hasLicenseError,
  errorsMsg,
  onEditClick,
}) => {
  return (
    <CaseCallOut
      hasConnectors={hasConnectors}
      hasLicenseError={hasLicenseError}
      messages={errorsMsg}
      onEditClick={onEditClick}
    />
  );
};

PushCalloutsComponent.displayName = 'PushCalloutsComponent';

export const PushCallouts = React.memo(PushCalloutsComponent);
