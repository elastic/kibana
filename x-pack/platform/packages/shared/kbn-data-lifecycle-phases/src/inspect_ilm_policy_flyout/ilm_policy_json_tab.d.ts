/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import type { SerializedPolicy } from '@kbn/index-lifecycle-management-common-shared';
export interface IlmPolicyJsonTabProps {
  policyName: string;
  policy: SerializedPolicy;
}
export declare const IlmPolicyJsonTab: ({
  policyName,
  policy,
}: IlmPolicyJsonTabProps) => React.JSX.Element;
