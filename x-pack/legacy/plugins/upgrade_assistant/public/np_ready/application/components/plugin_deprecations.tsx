/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import {
  EuiAccordion,
  EuiText,
  EuiCallOut,
  EuiPageContent,
  EuiSpacer,
  EuiFlexItem,
  EuiFlexGroup,
  EuiIcon,
} from '@elastic/eui';
import { useAppContext } from '../app_context';

export interface PluginDeprecation {
  title: string;
  description: string;
}

export interface PluginDeprecationData {
  name: string;
  deprecations: PluginDeprecation[];
}

export const PluginDeprecations: FunctionComponent = () => {
  const { security } = useAppContext();
  const securityDeprecations: PluginDeprecationData = security.getDeprecationData();
  return (
    <EuiPageContent>
      <EuiText>
        <h3>Kibana Plugin Deprecations</h3>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiAccordion
        initialIsOpen
        id={`pluginDepreactions${securityDeprecations.name}`}
        buttonContent={
          <>
            {' '}
            <EuiIcon type="logoSecurity" size="m" /> {securityDeprecations.name}
          </>
        }
      >
        <>
          <EuiSpacer size="m" />
          <EuiFlexGroup direction="column" gutterSize="m">
            {securityDeprecations.deprecations.map((d, idx) => {
              return (
                <EuiFlexItem key={idx}>
                  <EuiCallOut size="s" title={d.title} color="warning">
                    <EuiText size="s">{d.description}</EuiText>
                  </EuiCallOut>
                  <EuiSpacer size="s" />
                </EuiFlexItem>
              );
            })}
          </EuiFlexGroup>
        </>
      </EuiAccordion>
    </EuiPageContent>
  );
};
