/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiCallOut, EuiButton, EuiDescriptionList, EuiSpacer } from '@elastic/eui';
import React, { memo, useCallback, useState } from 'react';

import * as i18n from './translations';

interface ErrorsPushServiceCallOut {
  errors: Array<{ title: string; description: JSX.Element }>;
}

const ErrorsPushServiceCallOutComponent = ({ errors }: ErrorsPushServiceCallOut) => {
  const [showCallOut, setShowCallOut] = useState(true);
  const handleCallOut = useCallback(() => setShowCallOut(false), [setShowCallOut]);

  return showCallOut ? (
    <>
      <EuiCallOut title={i18n.ERROR_PUSH_SERVICE_CALLOUT_TITLE} color="primary" iconType="gear">
        <EuiDescriptionList listItems={errors} />
        <EuiButton color="primary" onClick={handleCallOut}>
          {i18n.DISMISS_CALLOUT}
        </EuiButton>
      </EuiCallOut>
      <EuiSpacer />
    </>
  ) : null;
};

export const ErrorsPushServiceCallOut = memo(ErrorsPushServiceCallOutComponent);
