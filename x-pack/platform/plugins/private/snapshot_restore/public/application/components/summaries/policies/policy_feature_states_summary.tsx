/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlexItem,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
} from '@elastic/eui';
import { SnapshotConfig } from '../../../../../common/types';
import { FEATURE_STATES_NONE_OPTION } from '../../../../../common/constants';
import { CollapsibleFeatureStatesList } from '../../collapsible_lists';

export const PolicyFeatureStatesSummary: React.FunctionComponent<SnapshotConfig> = ({
  includeGlobalState,
  featureStates,
}) => {
  const hasGlobalStateButNoFeatureStates = includeGlobalState && featureStates === undefined;
  const hasNoFeatureStates = !featureStates || featureStates?.includes(FEATURE_STATES_NONE_OPTION);
  const hasAllFeatureStates = hasGlobalStateButNoFeatureStates || featureStates?.length === 0;

  return (
    <EuiFlexItem data-test-subj="policyFeatureStatesSummary">
      <EuiDescriptionList textStyle="reverse">
        <EuiDescriptionListTitle>
          <FormattedMessage
            id="xpack.snapshotRestore.summary.policyFeatureStatesLabel"
            defaultMessage="Include feature state {hasSpecificFeatures, plural, one {from} other {}}"
            values={{ hasSpecificFeatures: !hasNoFeatureStates && !hasAllFeatureStates ? 1 : 0 }}
          />
        </EuiDescriptionListTitle>
        <EuiDescriptionListDescription data-test-subj="value">
          {!hasGlobalStateButNoFeatureStates && hasNoFeatureStates && (
            <FormattedMessage
              id="xpack.snapshotRestore.summary.policyNoFeatureStatesLabel"
              defaultMessage="No"
            />
          )}
          {hasAllFeatureStates && (
            <FormattedMessage
              id="xpack.snapshotRestore.summary.policyAllFeatureStatesLabel"
              defaultMessage="All features"
            />
          )}
          {!hasNoFeatureStates && !hasAllFeatureStates && (
            <CollapsibleFeatureStatesList featureStates={featureStates} />
          )}
        </EuiDescriptionListDescription>
      </EuiDescriptionList>
    </EuiFlexItem>
  );
};
