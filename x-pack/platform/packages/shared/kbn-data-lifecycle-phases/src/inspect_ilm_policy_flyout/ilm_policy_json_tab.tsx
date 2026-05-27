/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCodeBlock } from '@elastic/eui';
import type { SerializedPolicy } from '@kbn/index-lifecycle-management-common-shared';
import { inspectIlmPolicyFlyoutStrings as strings } from './strings';

export interface IlmPolicyJsonTabProps {
  policyName: string;
  policy: SerializedPolicy;
}

export const IlmPolicyJsonTab = ({ policyName, policy }: IlmPolicyJsonTabProps) => {
  const { name: _name, ...policyBody } = policy;
  const fullRequest = `PUT _ilm/policy/${policyName}\n${JSON.stringify(
    { policy: policyBody },
    null,
    2
  )}`;

  return (
    <EuiCodeBlock
      language="json"
      isCopyable
      transparentBackground
      paddingSize="l"
      fontSize="s"
      copyAriaLabel={strings.copyRequestAriaLabel}
      data-test-subj="ilmPolicyJsonTabCodeBlock"
    >
      {fullRequest}
    </EuiCodeBlock>
  );
};
