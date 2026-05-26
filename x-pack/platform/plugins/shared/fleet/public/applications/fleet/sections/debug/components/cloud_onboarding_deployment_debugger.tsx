/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCheckboxGroup,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiRadioGroup,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import {
  API_VERSIONS,
  CLOUD_CONNECTOR_API_ROUTES,
  CLOUD_ONBOARDING_DEPLOYMENT_API_ROUTES,
} from '../../../../../../common/constants';
import { sendRequest } from '../../../hooks';

import { CodeBlock } from './code_block';

interface ConnectorOption {
  id: string;
  name: string;
  roleArn?: string;
}

const AUTH_TYPE_OPTIONS = [
  { id: 'identity_federation', label: 'Federated Identity' },
  { id: 'static_keys', label: 'Static Keys' },
];

const SERVICE_OPTIONS = [
  { id: 'cloudwatch_metrics', label: 'CloudWatch Metrics' },
  { id: 'cloudfront_logs', label: 'CloudFront Logs' },
];

const MECHANISM_OPTIONS = [
  { id: 'agentless', label: 'Agentless' },
  { id: 'firehose', label: 'Firehose' },
  { id: 'cloud_forwarder', label: 'Cloud Forwarder' },
];

export const CloudOnboardingDeploymentDebugger: React.FunctionComponent = () => {
  const [connectors, setConnectors] = useState<ConnectorOption[]>([]);
  const [connectorsLoading, setConnectorsLoading] = useState(false);
  const [showNewConnectorForm, setShowNewConnectorForm] = useState(false);
  const [newConnectorName, setNewConnectorName] = useState('my-aws-connector');
  const [newConnectorRoleArn, setNewConnectorRoleArn] = useState(
    'arn:aws:iam::123456789012:role/ElasticRole'
  );
  const [newConnectorExternalId, setNewConnectorExternalId] = useState('ext-id-value');
  const [newConnectorError, setNewConnectorError] = useState('');
  const [newConnectorLoading, setNewConnectorLoading] = useState(false);

  const [authType, setAuthType] = useState<string>('identity_federation');
  const [connectorId, setConnectorId] = useState<string>('');
  const [selectedServices, setSelectedServices] = useState<Record<string, boolean>>({});
  const [selectedMechanisms, setSelectedMechanisms] = useState<Record<string, boolean>>({});
  const [serviceVarRegion, setServiceVarRegion] = useState<Record<string, string>>({});
  const [serviceVarBucketArn, setServiceVarBucketArn] = useState<Record<string, string>>({});
  const [createResult, setCreateResult] = useState<string>('');
  const [createError, setCreateError] = useState<string>('');

  const [deployments, setDeployments] = useState<
    Array<{ id: string; status: string; mechanisms: string[] }>
  >([]);
  const [deploymentsLoading, setDeploymentsLoading] = useState(false);

  const [getByIdValue, setGetByIdValue] = useState<string>('');
  const [getByIdResult, setGetByIdResult] = useState<string>('');
  const [getByIdError, setGetByIdError] = useState<string>('');

  const [setDeployingIdValue, setSetDeployingIdValue] = useState<string>('');
  const [setDeployingDeploymentId, setSetDeployingDeploymentId] = useState<string>('');
  const [setDeployingDeploymentName, setSetDeployingDeploymentName] = useState<string>('');
  const [setDeployingResult, setSetDeployingResult] = useState<string>('');
  const [setDeployingError, setSetDeployingError] = useState<string>('');

  const [deleteIdValue, setDeleteIdValue] = useState<string>('');
  const [deleteResult, setDeleteResult] = useState<string>('');
  const [deleteError, setDeleteError] = useState<string>('');

  const fetchConnectors = useCallback(async () => {
    setConnectorsLoading(true);
    const result = await sendRequest({
      method: 'get',
      path: CLOUD_CONNECTOR_API_ROUTES.LIST_PATTERN,
      version: API_VERSIONS.public.v1,
    });
    setConnectorsLoading(false);
    if (!result.error && result.data?.items) {
      setConnectors(
        result.data.items
          .filter((c: { cloudProvider?: string }) => c.cloudProvider === 'aws')
          .map((c: { id: string; name: string; vars?: { role_arn?: { value?: string } } }) => ({
            id: c.id,
            name: c.name,
            roleArn: c.vars?.role_arn?.value,
          }))
      );
    }
  }, []);

  useEffect(() => {
    fetchConnectors();
  }, [fetchConnectors]);

  const handleCreateConnector = async () => {
    setNewConnectorError('');
    setNewConnectorLoading(true);
    const result = await sendRequest({
      method: 'post',
      path: CLOUD_CONNECTOR_API_ROUTES.CREATE_PATTERN,
      body: {
        name: newConnectorName,
        cloudProvider: 'aws',
        accountType: 'single-account',
        vars: {
          role_arn: { value: newConnectorRoleArn, type: 'text' },
          external_id: { type: 'password', value: newConnectorExternalId },
        },
      },
      version: API_VERSIONS.public.v1,
    });
    setNewConnectorLoading(false);
    if (result.error) {
      setNewConnectorError(result.error.message ?? JSON.stringify(result.error));
    } else {
      const created = result.data?.item;
      if (created) {
        setConnectorId(created.id);
        setShowNewConnectorForm(false);
        setNewConnectorName('');
        setNewConnectorRoleArn('');
        setNewConnectorExternalId('');
        await fetchConnectors();
      }
    }
  };

  const fetchDeployments = useCallback(async (connId: string) => {
    if (!connId) {
      setDeployments([]);
      return;
    }
    setDeploymentsLoading(true);
    const result = await sendRequest({
      method: 'get',
      path: CLOUD_ONBOARDING_DEPLOYMENT_API_ROUTES.BY_CONNECTOR_PATTERN.replace(
        '{connectorId}',
        connId
      ),
      version: API_VERSIONS.public.v1,
    });
    setDeploymentsLoading(false);
    if (!result.error && result.data?.items) {
      setDeployments(
        result.data.items.map((d: { id: string; status: string; mechanisms: string[] }) => ({
          id: d.id,
          status: d.status,
          mechanisms: d.mechanisms,
        }))
      );
    }
  }, []);

  useEffect(() => {
    fetchDeployments(connectorId);
  }, [connectorId, fetchDeployments]);

  const activeServices = SERVICE_OPTIONS.filter((s) => selectedServices[s.id]);
  const activeMechanisms = Object.entries(selectedMechanisms)
    .filter(([, v]) => v)
    .map(([k]) => k);

  const firehoseSelected = selectedMechanisms.firehose;
  const cloudForwarderSelected = selectedMechanisms.cloud_forwarder;

  const availableMechanisms = MECHANISM_OPTIONS;

  const buildServiceVars = () => {
    const result: Record<string, Array<Record<string, unknown>>> = {};
    for (const service of activeServices) {
      const entry: Record<string, unknown> = {};
      if (firehoseSelected && serviceVarRegion[service.id]) {
        entry.regions = [serviceVarRegion[service.id]];
      }
      if (cloudForwarderSelected && serviceVarBucketArn[service.id]) {
        entry.s3_bucket_arn = serviceVarBucketArn[service.id];
      }
      if (Object.keys(entry).length > 0) {
        result[service.id] = [entry];
      }
    }
    return result;
  };

  const handleCreate = async () => {
    setCreateError('');
    setCreateResult('');
    const serviceVars = buildServiceVars();
    const result = await sendRequest({
      method: 'post',
      path: CLOUD_ONBOARDING_DEPLOYMENT_API_ROUTES.CREATE_PATTERN,
      body: {
        provider: 'aws',
        connectorId,
        mechanisms: activeMechanisms,
        services: activeServices.map((s) => s.id),
        serviceVars: Object.keys(serviceVars).length > 0 ? serviceVars : undefined,
      },
      version: API_VERSIONS.public.v1,
    });
    if (result.error) {
      setCreateError(result.error.message ?? JSON.stringify(result.error));
    } else {
      setCreateResult(JSON.stringify(result.data, null, 2));
      await fetchDeployments(connectorId);
    }
  };

  const handleGetById = async () => {
    setGetByIdError('');
    setGetByIdResult('');
    const result = await sendRequest({
      method: 'get',
      path: CLOUD_ONBOARDING_DEPLOYMENT_API_ROUTES.INFO_PATTERN.replace('{id}', getByIdValue),
      version: API_VERSIONS.public.v1,
    });
    if (result.error) {
      setGetByIdError(result.error.message ?? JSON.stringify(result.error));
    } else {
      setGetByIdResult(JSON.stringify(result.data, null, 2));
    }
  };

  const handleSetDeploying = async () => {
    setSetDeployingError('');
    setSetDeployingResult('');
    const result = await sendRequest({
      method: 'put',
      path: CLOUD_ONBOARDING_DEPLOYMENT_API_ROUTES.UPDATE_PATTERN.replace(
        '{id}',
        setDeployingIdValue
      ),
      body: {
        status: 'deploying',
        deploymentId: setDeployingDeploymentId || undefined,
        deploymentName: setDeployingDeploymentName || undefined,
      },
      version: API_VERSIONS.public.v1,
    });
    if (result.error) {
      setSetDeployingError(result.error.message ?? JSON.stringify(result.error));
    } else {
      setSetDeployingResult(JSON.stringify(result.data, null, 2));
      await fetchDeployments(connectorId);
    }
  };

  const handleDelete = async () => {
    setDeleteError('');
    setDeleteResult('');
    const result = await sendRequest({
      method: 'delete',
      path: CLOUD_ONBOARDING_DEPLOYMENT_API_ROUTES.DELETE_PATTERN.replace('{id}', deleteIdValue),
      version: API_VERSIONS.public.v1,
    });
    if (result.error) {
      setDeleteError(result.error.message ?? JSON.stringify(result.error));
    } else {
      setDeleteResult(JSON.stringify(result.data, null, 2));
    }
  };

  return (
    <>
      <EuiText grow={false}>
        <p>
          Test the Cloud Onboarding Deployment API. Create, retrieve, and delete cloud onboarding
          deployments.
        </p>
      </EuiText>

      <EuiSpacer size="l" />

      <EuiTitle size="s">
        <h3>Fleet Cloud Connectors (AWS)</h3>
      </EuiTitle>

      <EuiSpacer size="m" />

      {connectorsLoading ? (
        <EuiLoadingSpinner />
      ) : connectors.length === 0 ? (
        <EuiText size="s" color="subdued">
          No AWS connectors found.
        </EuiText>
      ) : (
        <EuiRadioGroup
          options={connectors.map((c) => ({
            id: c.id,
            label: (
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>{c.name}</EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">{c.id.slice(0, 8)}&hellip;</EuiBadge>
                </EuiFlexItem>
                {c.roleArn && (
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs" color="subdued">
                      {c.roleArn}
                    </EuiText>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            ),
          }))}
          idSelected={connectorId}
          onChange={(id) => setConnectorId(id)}
          name="connectorSelect"
        />
      )}

      <EuiSpacer size="s" />

      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty size="s" onClick={() => fetchConnectors()} iconType="refresh">
            Refresh
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            iconType={showNewConnectorForm ? 'minus' : 'plus'}
            onClick={() => setShowNewConnectorForm((v) => !v)}
          >
            {showNewConnectorForm ? 'Cancel' : 'New connector'}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>

      {showNewConnectorForm && (
        <>
          <EuiSpacer size="m" />
          <EuiFlexGroup gutterSize="m" wrap>
            <EuiFlexItem grow={false}>
              <EuiFormRow label="Name">
                <EuiFieldText
                  value={newConnectorName}
                  onChange={(e) => setNewConnectorName(e.target.value)}
                  placeholder="my-aws-connector"
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem grow={false} style={{ minWidth: 340 }}>
              <EuiFormRow label="Role ARN">
                <EuiFieldText
                  value={newConnectorRoleArn}
                  onChange={(e) => setNewConnectorRoleArn(e.target.value)}
                  placeholder="arn:aws:iam::123456789012:role/ElasticRole"
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFormRow label="External ID">
                <EuiFieldText
                  value={newConnectorExternalId}
                  onChange={(e) => setNewConnectorExternalId(e.target.value)}
                  placeholder="ext-id-value"
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem grow={false} style={{ paddingTop: 28 }}>
              <EuiButton
                onClick={handleCreateConnector}
                isLoading={newConnectorLoading}
                isDisabled={!newConnectorName || !newConnectorRoleArn}
                fill
                size="s"
              >
                Create connector
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
          {newConnectorError && (
            <>
              <EuiSpacer size="s" />
              <EuiCallOut announceOnMount title="Error" color="danger" size="s">
                {newConnectorError}
              </EuiCallOut>
            </>
          )}
        </>
      )}

      <EuiSpacer size="xl" />

      <EuiTitle size="s">
        <h3>Create Deployment</h3>
      </EuiTitle>

      <EuiSpacer size="m" />

      <EuiFormRow label="Auth type">
        <EuiRadioGroup
          options={AUTH_TYPE_OPTIONS}
          idSelected={authType}
          onChange={(id) => {
            setAuthType(id);
            if (id === 'static_keys') {
              setSelectedMechanisms((prev) => ({ ...prev, identity_federation: false }));
            }
          }}
          name="authType"
        />
      </EuiFormRow>

      <EuiSpacer size="m" />

      <EuiFormRow label="Connector ID">
        <EuiSelect
          value={connectorId}
          onChange={(e) => setConnectorId(e.target.value)}
          hasNoInitialSelection
          options={connectors.map((c) => ({
            value: c.id,
            text: `${c.name} (${c.id.slice(0, 8)}…)`,
          }))}
          disabled={connectorsLoading}
          isLoading={connectorsLoading}
        />
      </EuiFormRow>

      <EuiSpacer size="m" />

      <EuiFormRow label="Services">
        <EuiCheckboxGroup
          options={SERVICE_OPTIONS}
          idToSelectedMap={selectedServices}
          onChange={(id) => setSelectedServices((prev) => ({ ...prev, [id]: !prev[id] }))}
        />
      </EuiFormRow>

      <EuiSpacer size="m" />

      <EuiFormRow label="Available mechanisms">
        <EuiCheckboxGroup
          options={availableMechanisms}
          idToSelectedMap={selectedMechanisms}
          onChange={(id) => setSelectedMechanisms((prev) => ({ ...prev, [id]: !prev[id] }))}
        />
      </EuiFormRow>

      {activeServices.length > 0 && (firehoseSelected || cloudForwarderSelected) && (
        <>
          <EuiSpacer size="m" />
          <EuiTitle size="xs">
            <h4>Service vars</h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          {activeServices.map((service) => (
            <div key={service.id}>
              <EuiText size="s">
                <strong>{service.label}</strong>
              </EuiText>
              <EuiSpacer size="s" />
              <EuiFlexGroup gutterSize="m" wrap>
                {firehoseSelected && (
                  <EuiFlexItem grow={false}>
                    <EuiFormRow label="Region (firehose)">
                      <EuiFieldText
                        value={serviceVarRegion[service.id] ?? ''}
                        onChange={(e) =>
                          setServiceVarRegion((prev) => ({
                            ...prev,
                            [service.id]: e.target.value,
                          }))
                        }
                        placeholder="us-east-1"
                      />
                    </EuiFormRow>
                  </EuiFlexItem>
                )}
                {cloudForwarderSelected && (
                  <EuiFlexItem grow={false}>
                    <EuiFormRow label="Source bucket ARN (cloud_forwarder)">
                      <EuiFieldText
                        value={serviceVarBucketArn[service.id] ?? ''}
                        onChange={(e) =>
                          setServiceVarBucketArn((prev) => ({
                            ...prev,
                            [service.id]: e.target.value,
                          }))
                        }
                        placeholder="arn:aws:s3:::my-bucket"
                      />
                    </EuiFormRow>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
              <EuiSpacer size="s" />
            </div>
          ))}
        </>
      )}

      <EuiSpacer size="m" />

      <EuiButton onClick={handleCreate} fill>
        Create
      </EuiButton>

      {createError && (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut announceOnMount title="Error" color="danger">
            {createError}
          </EuiCallOut>
        </>
      )}

      {createResult && (
        <>
          <EuiSpacer size="m" />
          <CodeBlock value={createResult} />
        </>
      )}

      <EuiSpacer size="xl" />

      <EuiTitle size="s">
        <h3>Get by ID</h3>
      </EuiTitle>

      <EuiSpacer size="m" />

      <EuiFlexGroup alignItems="flexEnd" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiFormRow label="Deployment">
            <EuiSelect
              value={getByIdValue}
              onChange={(e) => setGetByIdValue(e.target.value)}
              hasNoInitialSelection
              options={[
                { value: '', text: 'Select a deployment…' },
                ...deployments.map((d) => ({
                  value: d.id,
                  text: `${d.id.slice(0, 8)}… [${d.status}] (${d.mechanisms.join(', ')})`,
                })),
              ]}
              disabled={deploymentsLoading}
              isLoading={deploymentsLoading}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton onClick={handleGetById} isDisabled={!getByIdValue}>
            Get
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      {getByIdError && (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut announceOnMount title="Error" color="danger">
            {getByIdError}
          </EuiCallOut>
        </>
      )}

      {getByIdResult && (
        <>
          <EuiSpacer size="m" />
          <CodeBlock value={getByIdResult} />
        </>
      )}

      <EuiSpacer size="xl" />

      <EuiTitle size="s">
        <h3>Set Deploying</h3>
      </EuiTitle>

      <EuiSpacer size="m" />

      <EuiFlexGroup alignItems="flexEnd" gutterSize="m" wrap>
        <EuiFlexItem grow={false}>
          <EuiFormRow label="Deployment">
            <EuiSelect
              value={setDeployingIdValue}
              onChange={(e) => setSetDeployingIdValue(e.target.value)}
              hasNoInitialSelection
              options={deployments.map((d) => ({
                value: d.id,
                text: `${d.id.slice(0, 8)}… [${d.status}] (${d.mechanisms.join(', ')})`,
              }))}
              disabled={deploymentsLoading}
              isLoading={deploymentsLoading}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false} style={{ minWidth: 340 }}>
          <EuiFormRow label="Deployment ID (stack ARN)">
            <EuiFieldText
              value={setDeployingDeploymentId}
              onChange={(e) => setSetDeployingDeploymentId(e.target.value)}
              placeholder="arn:aws:cloudformation:us-east-1:123456789012:stack/elastic/aaa"
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow label="Deployment name (stack name)">
            <EuiFieldText
              value={setDeployingDeploymentName}
              onChange={(e) => setSetDeployingDeploymentName(e.target.value)}
              placeholder="elastic-onboarding"
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton onClick={handleSetDeploying} isDisabled={!setDeployingIdValue}>
            Set deploying
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      {setDeployingError && (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut announceOnMount title="Error" color="danger">
            {setDeployingError}
          </EuiCallOut>
        </>
      )}

      {setDeployingResult && (
        <>
          <EuiSpacer size="m" />
          <CodeBlock value={setDeployingResult} />
        </>
      )}

      <EuiSpacer size="xl" />

      <EuiTitle size="s">
        <h3>Delete</h3>
      </EuiTitle>

      <EuiSpacer size="m" />

      <EuiFlexGroup alignItems="flexEnd" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiFormRow label="Deployment ID">
            <EuiFieldText
              value={deleteIdValue}
              onChange={(e) => setDeleteIdValue(e.target.value)}
              placeholder="Enter deployment ID"
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton onClick={handleDelete} color="danger">
            Delete
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      {deleteError && (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut announceOnMount title="Error" color="danger">
            {deleteError}
          </EuiCallOut>
        </>
      )}

      {deleteResult && (
        <>
          <EuiSpacer size="m" />
          <CodeBlock value={deleteResult} />
        </>
      )}
    </>
  );
};
