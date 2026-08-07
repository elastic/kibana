/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import type { AwsServiceEntry } from './aws_services_data';

// Intentionally minimal — this step will be redesigned. It exists so the flow
// is walkable end to end and so "Trigger source" (referenced by step 4 copy)
// has a home.
export const StepServiceSettings: React.FunctionComponent<{
  services: AwsServiceEntry[];
  triggerSources: Record<string, string>;
  onTriggerSourceChange: (serviceId: string, value: string) => void;
}> = ({ services, triggerSources, onTriggerSourceChange }) => {
  return (
    <>
      <EuiTitle size="m">
        <h2>Service Settings</h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        <p>
          Configure how each selected service delivers data. The defaults work for most AWS
          accounts.
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiPanel hasBorder paddingSize="l">
        {services.map((service, i) => (
          <React.Fragment key={service.id}>
            {i > 0 && <EuiHorizontalRule margin="m" />}
            <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon type="logoAWS" size="m" />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s">
                  <strong>{service.name}</strong>
                </EuiText>
              </EuiFlexItem>
              {service.dataTypes.map((dt) => (
                <EuiFlexItem grow={false} key={dt}>
                  <EuiBadge color="hollow">{dt}</EuiBadge>
                </EuiFlexItem>
              ))}
              <EuiFlexItem grow={false} style={{ width: 220 }}>
                {service.dataTypes.includes('Logs') ? (
                  <EuiSelect
                    compressed
                    prepend="Trigger source"
                    options={[
                      { value: 's3', text: 'S3' },
                      { value: 'cloudwatch', text: 'CloudWatch' },
                    ]}
                    value={triggerSources[service.id] ?? 's3'}
                    onChange={(e) => onTriggerSourceChange(service.id, e.target.value)}
                    aria-label={`Trigger source for ${service.name}`}
                  />
                ) : (
                  <EuiText size="xs" color="subdued" textAlign="right">
                    No settings required
                  </EuiText>
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          </React.Fragment>
        ))}
      </EuiPanel>
    </>
  );
};
