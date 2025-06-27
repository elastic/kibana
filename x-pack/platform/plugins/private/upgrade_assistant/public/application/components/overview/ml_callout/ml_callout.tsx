/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useAppContext } from '../../../app_context';

export const MachineLearningDisabledCallout: React.FunctionComponent = () => {
  const {
    services: { api },
  } = useAppContext();

  const [mlEnabled, setMlEnabled] = useState<boolean>(true);

  useEffect(() => {
    api.getMLEnabled().then(({ data }) => {
      setMlEnabled(data.mlEnabled);
    });
  }, [api]);

  return (
    !mlEnabled && (
      <>
        <EuiSpacer size="s" />
        <EuiCallOut
          title={
            <FormattedMessage
              id="xpack.upgradeAssistant.overview.mlCallout.title"
              defaultMessage="Machine Learning is disabled"
            />
          }
          color="warning"
          iconType="warning"
          data-test-subj="mlDisabledCallout"
        >
          <FormattedMessage
            id="xpack.upgradeAssistant.overview.mlCallout.description"
            defaultMessage="Machine Learning is disabled in your cluster. Upgrade Assistant will not be able to check for any Machine Learning deprecations or issues. Please enable Machine Learning in your cluster to use this feature."
          />
        </EuiCallOut>
      </>
    )
  );
};
