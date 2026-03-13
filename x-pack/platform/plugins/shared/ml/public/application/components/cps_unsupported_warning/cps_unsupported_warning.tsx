/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useState } from 'react';

import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { useMlKibana } from '../../contexts/kibana/kibana_context';

const CPS_UNSUPPORTED_CALLOUT_STORAGE_KEY = 'ml.cpsUnsupportedCalloutDismissed';

export const CPSUnsupportedWarning: FC = () => {
  const {
    services: { cps, storage },
  } = useMlKibana();

  const isCpsEnabled = Boolean(cps?.cpsManager);
  const [isDismissed, setIsDismissed] = useState(() => {
    return isCpsEnabled ? storage.get(CPS_UNSUPPORTED_CALLOUT_STORAGE_KEY) === true : false;
  });

  const onDismiss = useCallback(() => {
    setIsDismissed(true);
    storage.set(CPS_UNSUPPORTED_CALLOUT_STORAGE_KEY, true);
  }, [storage]);

  if (!isCpsEnabled || isDismissed) {
    return null;
  }

  return (
    <>
      <EuiCallOut
        title={i18n.translate('xpack.ml.cpsUnsupportedCallout.title', {
          defaultMessage: 'Cross-project search for anomaly detection coming soon',
        })}
        iconType="info"
        onDismiss={onDismiss}
        dismissButtonProps={{ 'data-test-subj': 'mlCpsUnsupportedCalloutDismiss' }}
        data-test-subj="mlCpsUnsupportedCallout"
        announceOnMount
      >
        <p>
          <FormattedMessage
            id="xpack.ml.cpsUnsupportedCallout.description"
            defaultMessage="While we're working on this feature, all anomaly detection searches will be limited to the current project."
          />
        </p>
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
};
