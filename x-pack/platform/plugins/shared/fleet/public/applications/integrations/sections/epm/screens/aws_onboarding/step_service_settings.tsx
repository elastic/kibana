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

const AWS_REGIONS = [
  { value: 'us-east-1', text: 'us-east-1' },
  { value: 'us-east-2', text: 'us-east-2' },
  { value: 'us-west-1', text: 'us-west-1' },
  { value: 'us-west-2', text: 'us-west-2' },
  { value: 'eu-west-1', text: 'eu-west-1' },
  { value: 'eu-west-2', text: 'eu-west-2' },
  { value: 'eu-central-1', text: 'eu-central-1' },
  { value: 'ap-southeast-1', text: 'ap-southeast-1' },
  { value: 'ap-southeast-2', text: 'ap-southeast-2' },
  { value: 'ap-northeast-1', text: 'ap-northeast-1' },
  { value: 'ap-northeast-2', text: 'ap-northeast-2' },
  { value: 'ap-south-1', text: 'ap-south-1' },
  { value: 'sa-east-1', text: 'sa-east-1' },
  { value: 'ca-central-1', text: 'ca-central-1' },
];

export const StepServiceSettings: React.FunctionComponent<{
  services: AwsServiceEntry[];
  triggerSources: Record<string, string>;
  onTriggerSourceChange: (serviceId: string, value: string) => void;
  globalRegion: string;
  onGlobalRegionChange: (region: string) => void;
}> = ({ services, triggerSources, onTriggerSourceChange, globalRegion, onGlobalRegionChange }) => {
  return (
    <>
      <EuiFlexGroup alignItems="flexStart" justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem grow={false}>
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
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <strong>Global AWS region</strong>
              </EuiText>
              <EuiText size="xs" color="subdued">
                Can be overridden per service
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false} style={{ minWidth: 180 }}>
              <EuiSelect
                options={AWS_REGIONS}
                value={globalRegion}
                onChange={(e) => onGlobalRegionChange(e.target.value)}
                aria-label="Global AWS region"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
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
