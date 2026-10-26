/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { EuiFormRow } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import type { NewAgentPolicy, AgentPolicy } from '../../../../../common/types';

import type { NewPackagePolicy } from '../../types';

import { GlobalDataTagsTable } from './global_data_tags_table';

interface Props {
  packagePolicy: NewPackagePolicy;
  updatePackagePolicy: (u: Partial<NewPackagePolicy>) => void;
  isDisabled?: boolean;
}

export const PackagePolicyCustomFields: React.FunctionComponent<Props> = ({
  packagePolicy,
  updatePackagePolicy,
  isDisabled,
}) => {
  const handleTagsUpdate = (update: Partial<NewAgentPolicy | AgentPolicy>) => {
    updatePackagePolicy({ global_data_tags: update.global_data_tags });
  };

  return (
    <EuiFormRow
      fullWidth
      label={
        <FormattedMessage
          id="xpack.fleet.packagePolicyForm.globalDataTagHeader"
          defaultMessage="Custom fields"
        />
      }
      helpText={
        <FormattedMessage
          id="xpack.fleet.packagePolicyForm.globalDataTagDescription"
          defaultMessage="Add a field-value pair to all data collected from this integration."
        />
      }
    >
      <GlobalDataTagsTable
        isDisabled={isDisabled}
        updateAgentPolicy={handleTagsUpdate}
        globalDataTags={packagePolicy.global_data_tags ?? []}
      />
    </EuiFormRow>
  );
};
