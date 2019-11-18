/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTextColor, EuiTitle } from '@elastic/eui';
import styled from 'styled-components';
import { entries } from '../../common/type_utils';
import { RequirementsByServiceName } from '../../common/types';
import { ServiceTitleMap } from '../constants';
import { useCore } from '../hooks/use_core';
import { VersionBadge } from './version_badge';

export interface RequirementsProps {
  requirements: RequirementsByServiceName;
}

export function Requirements(props: RequirementsProps) {
  const { requirements } = props;
  const { theme } = useCore();

  const Text = styled.span`
    padding-bottom: ${theme.eui.paddingSizes.m};
  `;

  return (
    <Fragment>
      <EuiTitle size="xs">
        <Text>Compatibility</Text>
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
              <VersionBadge version={requirement.versions} />
            </div>
          </EuiFlexItem>
        </EuiFlexGroup>
      ))}
    </Fragment>
  );
}
