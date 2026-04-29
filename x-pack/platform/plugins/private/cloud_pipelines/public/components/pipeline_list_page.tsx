/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiPageTemplate,
  EuiButton,
  EuiSpacer,
  EuiText,
  EuiEmptyPrompt,
  EuiBadge,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiFieldText,
  EuiFormRow,
} from '@elastic/eui';
import type { HttpSetup } from '@kbn/core/public';
import { API_BASE, API_PIPELINES, API_TENANT } from '../../common';

interface TenantInfo {
  targetType: string;
  targetId: string;
}

interface PipelineState {
  exists: boolean;
  config?: string;
}

interface Props {
  http: HttpSetup;
}

const prettyJson = (raw: string | undefined): string => {
  if (!raw) return '';
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
};

export const PipelineListPage: React.FC<Props> = ({ http }) => {
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [pipeline, setPipeline] = useState<PipelineState | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportStream, setExportStream] = useState('logs');

  const fetchTenant = useCallback(async () => {
    try {
      const data = await http.get(API_TENANT);
      setTenant(data as TenantInfo);
    } catch {
      setTenant(null);
    }
  }, [http]);

  const fetchPipeline = useCallback(async () => {
    setLoading(true);
    try {
      const data = await http.get(API_PIPELINES);
      setPipeline(data as PipelineState);
    } catch {
      setPipeline({ exists: false });
    } finally {
      setLoading(false);
    }
  }, [http]);

  useEffect(() => {
    fetchTenant();
  }, [fetchTenant]);

  useEffect(() => {
    if (tenant) fetchPipeline();
  }, [tenant, fetchPipeline]);

  const handleExportBundle = async () => {
    setExporting(true);
    try {
      const bundle = await http.get(
        `${API_BASE}/streams/${encodeURIComponent(exportStream)}/bundle`
      );
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${exportStream}-bundle.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // swallow for now
    } finally {
      setExporting(false);
    }
  };

  if (!tenant) {
    return (
      <EuiPageTemplate>
        <EuiPageTemplate.Section>
          <EuiLoadingSpinner size="l" />
        </EuiPageTemplate.Section>
      </EuiPageTemplate>
    );
  }

  const tenantLabel = `${tenant.targetType}/${tenant.targetId}`;

  return (
    <EuiPageTemplate>
      <EuiPageTemplate.Header
        pageTitle={`Pipeline — ${tenant.targetId}`}
        description={
          <>
            Active StreamLang bundle for{' '}
            <EuiBadge color="hollow">{tenantLabel}</EuiBadge>. The bundle is
            produced automatically from this tenant's wired streams and pushed
            to the managed OTel execution layer.
          </>
        }
        rightSideItems={[
          <EuiButton iconType="refresh" onClick={fetchPipeline} isLoading={loading}>
            Refresh
          </EuiButton>,
        ]}
      />
      <EuiPageTemplate.Section>
        {loading ? (
          <EuiLoadingSpinner size="l" />
        ) : pipeline?.exists ? (
          <EuiPanel paddingSize="l">
            <EuiText size="s">
              <h3>Active bundle</h3>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiText size="s">
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '12px' }}>
                {prettyJson(pipeline.config)}
              </pre>
            </EuiText>
          </EuiPanel>
        ) : (
          <EuiEmptyPrompt
            iconType="pipelineApp"
            title={<h2>No bundle pushed yet</h2>}
            body={
              <p>
                This tenant has no active processing bundle. Configure wired
                streams in the Streams app to have the watcher push a bundle
                automatically.
              </p>
            }
          />
        )}

        <EuiSpacer size="xl" />
        <EuiPanel paddingSize="l">
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
            <EuiFlexItem>
              <EuiText>
                <h3>Export Processing Bundle</h3>
                <p>
                  Download a JSON bundle containing the processing steps and
                  routing rules for a stream and all its descendants — useful for
                  inspection or bootstrapping external tooling.
                </p>
              </EuiText>
              <EuiSpacer size="s" />
              <EuiFormRow label="Root stream name">
                <EuiFieldText
                  value={exportStream}
                  onChange={(e) => setExportStream(e.target.value)}
                  placeholder="e.g. logs.otel"
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                iconType="exportAction"
                onClick={handleExportBundle}
                isLoading={exporting}
                isDisabled={!exportStream.trim()}
              >
                Export Bundle
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};
