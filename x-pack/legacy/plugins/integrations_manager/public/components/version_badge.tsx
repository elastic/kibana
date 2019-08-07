/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import { RequirementVersionValue } from '../../common/types';

export function VersionBadge({ version }: { version: RequirementVersionValue }) {
  return <EuiBadge color="hollow">v{version}</EuiBadge>;
}
