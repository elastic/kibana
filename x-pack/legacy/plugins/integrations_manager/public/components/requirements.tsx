/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTextColor, EuiTitle } from '@elastic/eui';
import { entries } from '../../common/type_utils';
import { RequirementsByServiceName } from '../../common/types';
import { ServiceTitleMap } from '../constants';
import { VersionBadge } from './version_badge';

export interface RequirementsProps {
  requirements: RequirementsByServiceName;
}

export function Requirements(props: RequirementsProps) {
  const { requirements } = props;
  return (
    <Fragment>
      <EuiTitle size="xs">
        <span style={{ paddingBottom: '16px' }}>Compatibility</span>
      </EuiTitle>
      {entries(requirements).map(([service, requirement]) => (
        <EuiFlexGroup key={service}>
          <EuiFlexItem grow={true}>
            <EuiTextColor color="subdued" key={service}>
              {ServiceTitleMap[service]}:
            </EuiTextColor>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <div>
              <VersionBadge version={requirement['version.min']} />
              <span>{' - '}</span>
              <VersionBadge version={requirement['version.max']} />
            </div>
          </EuiFlexItem>
        </EuiFlexGroup>
      ))}
    </Fragment>
  );
}
