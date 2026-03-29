/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import {
  EuiPageTemplate,
  EuiBasicTable,
  EuiButton,
  EuiButtonIcon,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTextArea,
  EuiComboBox,
  EuiSelect,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiTitle,
  EuiButtonEmpty,
  EuiCallOut,
  EuiText,
  EuiBadge,
  EuiSwitch,
  EuiPanel,
  EuiHorizontalRule,
} from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import type { ExecutionIdentity } from '../common/types';

const INDEX_PRIVILEGE_OPTIONS: EuiComboBoxOptionOption[] = [
  { label: 'read' },
  { label: 'write' },
  { label: 'index' },
  { label: 'create' },
  { label: 'delete' },
  { label: 'create_index' },
  { label: 'delete_index' },
  { label: 'manage' },
  { label: 'monitor' },
  { label: 'all' },
  { label: 'view_index_metadata' },
];

const CLUSTER_PRIVILEGE_OPTIONS: EuiComboBoxOptionOption[] = [
  { label: 'monitor' },
  { label: 'manage' },
  { label: 'manage_index_templates' },
  { label: 'manage_pipeline' },
  { label: 'manage_ingest_pipelines' },
  { label: 'manage_security' },
  { label: 'manage_api_key' },
  { label: 'all' },
];

interface IndexPrivilegeRow {
  indexPatterns: EuiComboBoxOptionOption[];
  privileges: EuiComboBoxOptionOption[];
}

interface KibanaFeatureConfig {
  id: string;
  name: string;
  category: { id: string; label: string };
  privileges: { all?: unknown; read?: unknown } | null;
}

interface KibanaFeaturePrivilege {
  featureId: string;
  featureName: string;
  privilege: 'all' | 'read' | 'none';
}

interface PrivilegeEditorProps {
  http: CoreStart['http'];
  onChange: (descriptors: Record<string, unknown>) => void;
}

const PRIVILEGE_LEVEL_OPTIONS: Array<{ value: 'all' | 'read' | 'none'; text: string }> = [
  { value: 'none', text: 'None' },
  { value: 'read', text: 'Read' },
  { value: 'all', text: 'All' },
];

const PrivilegeEditor: React.FC<PrivilegeEditorProps> = ({ http, onChange }) => {
  const [clusterPrivileges, setClusterPrivileges] = useState<EuiComboBoxOptionOption[]>([]);
  const [indexRows, setIndexRows] = useState<IndexPrivilegeRow[]>([
    { indexPatterns: [], privileges: [] },
  ]);
  const [kibanaFeatures, setKibanaFeatures] = useState<KibanaFeatureConfig[]>([]);
  const [featurePrivileges, setFeaturePrivileges] = useState<KibanaFeaturePrivilege[]>([]);
  const [kibanaSpaces, setKibanaSpaces] = useState<EuiComboBoxOptionOption[]>([{ label: '*' }]);

  useEffect(() => {
    http
      .get<KibanaFeatureConfig[]>('/api/features')
      .then((features) => {
        const visible = features.filter((f) => f.privileges !== null);
        setKibanaFeatures(visible);
        setFeaturePrivileges(
          visible.map((f) => ({
            featureId: f.id,
            featureName: f.name,
            privilege: 'none',
          }))
        );
      })
      .catch(() => {
        setKibanaFeatures([]);
      });
  }, [http]);

  const buildDescriptors = useCallback(
    (
      cluster: EuiComboBoxOptionOption[],
      rows: IndexPrivilegeRow[],
      featPrivs: KibanaFeaturePrivilege[],
      spaces: EuiComboBoxOptionOption[]
    ) => {
      const indexEntries = rows
        .filter((r) => r.indexPatterns.length > 0 && r.privileges.length > 0)
        .map((r) => ({
          names: r.indexPatterns.map((o) => o.label),
          privileges: r.privileges.map((o) => o.label),
        }));

      const esDescriptor: Record<string, unknown> = {};
      if (cluster.length > 0) {
        esDescriptor.cluster = cluster.map((o) => o.label);
      }
      if (indexEntries.length > 0) {
        esDescriptor.index = indexEntries;
      }

      const activeFeatures = featPrivs.filter((f) => f.privilege !== 'none');
      if (activeFeatures.length > 0) {
        const featureMap: Record<string, string[]> = {};
        for (const f of activeFeatures) {
          featureMap[f.featureId] = [f.privilege];
        }
        const spaceIds = spaces.map((s) => s.label);
        const kibanaEntry = {
          spaces: spaceIds,
          feature: featureMap,
        };
        const applicationName = 'kibana-.kibana';
        const privileges = activeFeatures.map((f) => `feature_${f.featureId}.${f.privilege}`);
        esDescriptor.applications = [
          {
            application: applicationName,
            privileges,
            resources: spaceIds[0] === '*' ? ['*'] : spaceIds.map((s) => `space:${s}`),
          },
        ];

        onChange({
          identity_role: {
            ...esDescriptor,
          },
          _kibana_privileges: [kibanaEntry],
        });
      } else {
        onChange({ identity_role: esDescriptor });
      }
    },
    [onChange]
  );

  const handleClusterChange = (selected: EuiComboBoxOptionOption[]) => {
    setClusterPrivileges(selected);
    buildDescriptors(selected, indexRows, featurePrivileges, kibanaSpaces);
  };

  const handleIndexPatternChange = (idx: number, selected: EuiComboBoxOptionOption[]) => {
    const updated = [...indexRows];
    updated[idx] = { ...updated[idx], indexPatterns: selected };
    setIndexRows(updated);
    buildDescriptors(clusterPrivileges, updated, featurePrivileges, kibanaSpaces);
  };

  const handlePrivilegeChange = (idx: number, selected: EuiComboBoxOptionOption[]) => {
    const updated = [...indexRows];
    updated[idx] = { ...updated[idx], privileges: selected };
    setIndexRows(updated);
    buildDescriptors(clusterPrivileges, updated, featurePrivileges, kibanaSpaces);
  };

  const handleFeaturePrivilegeChange = (featureId: string, privilege: 'all' | 'read' | 'none') => {
    const updated = featurePrivileges.map((f) =>
      f.featureId === featureId ? { ...f, privilege } : f
    );
    setFeaturePrivileges(updated);
    buildDescriptors(clusterPrivileges, indexRows, updated, kibanaSpaces);
  };

  const handleSpacesChange = (selected: EuiComboBoxOptionOption[]) => {
    const result = selected.length > 0 ? selected : [{ label: '*' }];
    setKibanaSpaces(result);
    buildDescriptors(clusterPrivileges, indexRows, featurePrivileges, result);
  };

  const addIndexRow = () => {
    setIndexRows([...indexRows, { indexPatterns: [], privileges: [] }]);
  };

  const removeIndexRow = (idx: number) => {
    const updated = indexRows.filter((_, i) => i !== idx);
    const result = updated.length > 0 ? updated : [{ indexPatterns: [], privileges: [] }];
    setIndexRows(result);
    buildDescriptors(clusterPrivileges, result, featurePrivileges, kibanaSpaces);
  };

  return (
    <>
      <EuiTitle size="xs">
        <h4>Elasticsearch privileges</h4>
      </EuiTitle>
      <EuiSpacer size="s" />

      <EuiFormRow label="Cluster privileges" helpText="Optional cluster-level permissions">
        <EuiComboBox
          options={CLUSTER_PRIVILEGE_OPTIONS}
          selectedOptions={clusterPrivileges}
          onChange={handleClusterChange}
          onCreateOption={(val) => handleClusterChange([...clusterPrivileges, { label: val }])}
          placeholder="Select cluster privileges"
          isClearable
        />
      </EuiFormRow>

      <EuiSpacer size="s" />
      <EuiText size="xs" color="subdued">
        <strong>Index privileges</strong>
      </EuiText>
      <EuiSpacer size="xs" />

      {indexRows.map((row, idx) => (
        <EuiPanel key={idx} paddingSize="s" hasBorder style={{ marginBottom: 8 }}>
          <EuiFlexGroup gutterSize="s" alignItems="flexEnd">
            <EuiFlexItem>
              <EuiFormRow label="Indices" fullWidth>
                <EuiComboBox
                  selectedOptions={row.indexPatterns}
                  onChange={(selected) => handleIndexPatternChange(idx, selected)}
                  onCreateOption={(val) =>
                    handleIndexPatternChange(idx, [...row.indexPatterns, { label: val }])
                  }
                  placeholder="e.g. logs-*, .alerts-*"
                  isClearable
                  fullWidth
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFormRow label="Privileges" fullWidth>
                <EuiComboBox
                  options={INDEX_PRIVILEGE_OPTIONS}
                  selectedOptions={row.privileges}
                  onChange={(selected) => handlePrivilegeChange(idx, selected)}
                  placeholder="Select privileges"
                  isClearable
                  fullWidth
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFormRow hasEmptyLabelSpace>
                <EuiButtonIcon
                  iconType="trash"
                  color="danger"
                  aria-label="Remove index privilege"
                  onClick={() => removeIndexRow(idx)}
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      ))}
      <EuiButtonEmpty size="s" iconType="plusInCircle" onClick={addIndexRow}>
        Add index privilege
      </EuiButtonEmpty>

      <EuiHorizontalRule margin="m" />

      <EuiTitle size="xs">
        <h4>Kibana privileges</h4>
      </EuiTitle>
      <EuiSpacer size="s" />

      <EuiFormRow label="Spaces" helpText="Which spaces these Kibana privileges apply to (* = all)">
        <EuiComboBox
          selectedOptions={kibanaSpaces}
          onChange={handleSpacesChange}
          onCreateOption={(val) => handleSpacesChange([...kibanaSpaces, { label: val }])}
          placeholder="* (all spaces)"
          isClearable
        />
      </EuiFormRow>

      <EuiSpacer size="s" />

      {kibanaFeatures.length > 0 ? (
        <EuiPanel paddingSize="s" hasBorder>
          <EuiBasicTable
            items={featurePrivileges}
            columns={[
              {
                field: 'featureName',
                name: 'Feature',
                width: '60%',
              },
              {
                field: 'privilege',
                name: 'Privilege',
                width: '40%',
                render: (_: unknown, item: KibanaFeaturePrivilege) => (
                  <EuiSelect
                    compressed
                    value={item.privilege}
                    options={PRIVILEGE_LEVEL_OPTIONS}
                    onChange={(e) =>
                      handleFeaturePrivilegeChange(
                        item.featureId,
                        e.target.value as 'all' | 'read' | 'none'
                      )
                    }
                    aria-label={`Privilege for ${item.featureName}`}
                  />
                ),
              },
            ]}
            tableLayout="fixed"
            compressed
          />
        </EuiPanel>
      ) : (
        <EuiText size="s" color="subdued">
          No Kibana features available
        </EuiText>
      )}
    </>
  );
};

const ExecutionIdentityApp: React.FC<{ http: CoreStart['http'] }> = ({ http }) => {
  const [identities, setIdentities] = useState<ExecutionIdentity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [roleDescriptors, setRoleDescriptors] = useState<Record<string, unknown>>({});
  const [rawJson, setRawJson] = useState('{}');
  const [useJsonEditor, setUseJsonEditor] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadIdentities = useCallback(async () => {
    setLoading(true);
    try {
      const response = await http.get<ExecutionIdentity[]>('/internal/execution_identity');
      setIdentities(response);
    } catch (err) {
      setError(`Failed to load: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [http]);

  useEffect(() => {
    loadIdentities();
  }, [loadIdentities]);

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    try {
      const descriptors = useJsonEditor ? JSON.parse(rawJson) : roleDescriptors;
      await http.post('/internal/execution_identity', {
        body: JSON.stringify({
          name,
          description,
          role_descriptors: descriptors,
        }),
      });
      setShowCreate(false);
      setName('');
      setDescription('');
      setRoleDescriptors({});
      setRawJson('{}');
      await loadIdentities();
    } catch (err) {
      setError(`Failed to create: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await http.delete(`/internal/execution_identity/${id}`);
      await loadIdentities();
    } catch (err) {
      setError(`Failed to delete: ${err.message}`);
    }
  };

  const handleEditorModeToggle = () => {
    if (!useJsonEditor) {
      setRawJson(JSON.stringify(roleDescriptors, null, 2));
    } else {
      try {
        setRoleDescriptors(JSON.parse(rawJson));
      } catch {
        // keep raw JSON if it can't be parsed
      }
    }
    setUseJsonEditor(!useJsonEditor);
  };

  const columns = [
    { field: 'name', name: 'Name', sortable: true },
    { field: 'description', name: 'Description' },
    {
      field: 'api_key_id',
      name: 'API Key ID',
      render: (val: string) => <EuiBadge color="hollow">{val}</EuiBadge>,
    },
    { field: 'created_by', name: 'Created By' },
    { field: 'created_at', name: 'Created At', dataType: 'date' as const },
    {
      name: 'Actions',
      render: (item: ExecutionIdentity) => (
        <EuiButtonEmpty size="s" color="danger" onClick={() => handleDelete(item.id)}>
          Delete
        </EuiButtonEmpty>
      ),
    },
  ];

  return (
    <EuiPageTemplate>
      <EuiPageTemplate.Header
        pageTitle="Execution Identities"
        description="Manage service accounts for workflow and rule execution"
        rightSideItems={[
          <EuiButton fill onClick={() => setShowCreate(true)}>
            Create identity
          </EuiButton>,
        ]}
      />
      <EuiPageTemplate.Section>
        {error && (
          <>
            <EuiCallOut announceOnMount color="danger" title="Error">
              <EuiText size="s">{error}</EuiText>
            </EuiCallOut>
            <EuiSpacer />
          </>
        )}
        <EuiBasicTable
          items={identities}
          columns={columns}
          loading={loading}
          rowHeader="name"
          noItemsMessage="No execution identities created yet"
        />
      </EuiPageTemplate.Section>

      {showCreate && (
        <EuiFlyout onClose={() => setShowCreate(false)} size="m">
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="m">
              <h2>Create execution identity</h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <EuiForm>
              <EuiFormRow label="Name" helpText="Human-readable name for this identity">
                <EuiFieldText
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. soc-responder"
                />
              </EuiFormRow>
              <EuiFormRow label="Description">
                <EuiFieldText
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Read access to alerts for SOC workflows"
                />
              </EuiFormRow>

              <EuiHorizontalRule margin="m" />

              <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiTitle size="xs">
                    <h3>Permissions</h3>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiSwitch
                    label="Edit as JSON"
                    checked={useJsonEditor}
                    onChange={handleEditorModeToggle}
                    compressed
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="s" />

              {useJsonEditor ? (
                <EuiFormRow
                  label="Role descriptors (JSON)"
                  helpText="Raw ES role_descriptors object"
                  fullWidth
                >
                  <EuiTextArea
                    fullWidth
                    rows={14}
                    value={rawJson}
                    onChange={(e) => setRawJson(e.target.value)}
                    style={{ fontFamily: 'monospace', fontSize: '13px' }}
                  />
                </EuiFormRow>
              ) : (
                <PrivilegeEditor http={http} onChange={setRoleDescriptors} />
              )}
            </EuiForm>
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty onClick={() => setShowCreate(false)}>Cancel</EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton fill onClick={handleCreate} isLoading={creating} disabled={!name.trim()}>
                  Create
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </EuiFlyout>
      )}
    </EuiPageTemplate>
  );
};

export function renderApp(coreStart: CoreStart, params: ManagementAppMountParams) {
  ReactDOM.render(<ExecutionIdentityApp http={coreStart.http} />, params.element);

  return () => {
    ReactDOM.unmountComponentAtNode(params.element);
  };
}
