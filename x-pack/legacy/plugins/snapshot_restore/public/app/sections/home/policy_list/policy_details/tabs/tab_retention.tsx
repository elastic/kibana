/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import {
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiText,
} from '@elastic/eui';

import { SlmPolicy } from '../../../../../../../common/types';
import { useAppDependencies } from '../../../../../index';

interface Props {
  policy: SlmPolicy;
}

export const TabRetention: React.FunctionComponent<Props> = ({ policy }) => {
  const {
    core: { i18n },
  } = useAppDependencies();
  const { FormattedMessage } = i18n;

  const { retention } = policy;

  if (retention) {
    const { expireAfterValue, expireAfterUnit, minCount, maxCount } = retention;

    return (
      <EuiDescriptionList textStyle="reverse">
        {expireAfterValue && (
          <Fragment>
            <EuiDescriptionListTitle>
              <FormattedMessage
                id="xpack.snapshotRestore.policyForm.stepReview.retentionTab.expireAfterLabel"
                defaultMessage="Expire after"
              />
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription>
              {expireAfterValue}
              {expireAfterUnit}
            </EuiDescriptionListDescription>
          </Fragment>
        )}
        {minCount && (
          <Fragment>
            <EuiDescriptionListTitle>
              <FormattedMessage
                id="xpack.snapshotRestore.policyForm.stepReview.retentionTab.minCountLabel"
                defaultMessage="Min count"
              />
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription>{minCount}</EuiDescriptionListDescription>
          </Fragment>
        )}
        {maxCount && (
          <Fragment>
            <EuiDescriptionListTitle>
              <FormattedMessage
                id="xpack.snapshotRestore.policyForm.stepReview.retentionTab.maxCountLabel"
                defaultMessage="Max count"
              />
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription>{maxCount}</EuiDescriptionListDescription>
          </Fragment>
        )}
      </EuiDescriptionList>
    );
  }

  return (
    <EuiText>
      <p>
        <FormattedMessage
          id="xpack.snapshotRestore.policyForm.stepReview.retentionTab.noRetentionMessage"
          defaultMessage="Retention not configured."
        />
      </p>
    </EuiText>
  );
};
