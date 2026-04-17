/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageHeader,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';
import type { HttpSetup, NotificationsStart } from '@kbn/core/public';

interface AgenticAnalysisSettings {
  enabled: boolean;
  owner: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface SettingsResponse {
  agenticAnalysis: AgenticAnalysisSettings;
}

interface AgenticAnalysisSettingsPageProps {
  http: HttpSetup;
  notifications: NotificationsStart;
}

const SETTINGS_API_PATH = '/api/alerting/v2/settings';
const AGENTIC_ANALYSIS_API_PATH = '/api/alerting/v2/settings/agentic-analysis';

export const AgenticAnalysisSettingsPage: React.FC<AgenticAnalysisSettingsPageProps> = ({
  http,
  notifications,
}) => {
  const [settings, setSettings] = useState<AgenticAnalysisSettings | null>(null);
  const [pendingEnabled, setPendingEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await http.get<SettingsResponse>(SETTINGS_API_PATH);
      setSettings(response.agenticAnalysis);
      setPendingEnabled(response.agenticAnalysis.enabled);
    } catch (err) {
      notifications.toasts.addError(err as Error, {
        title: 'Failed to load settings',
      });
    } finally {
      setLoading(false);
    }
  }, [http, notifications]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = useCallback(async () => {
    try {
      setSaving(true);
      const response = await http.post<AgenticAnalysisSettings>(AGENTIC_ANALYSIS_API_PATH, {
        body: JSON.stringify({ enabled: pendingEnabled }),
      });
      setSettings(response);
      notifications.toasts.addSuccess(
        pendingEnabled ? 'Agentic analysis enabled' : 'Agentic analysis disabled'
      );
    } catch (err) {
      notifications.toasts.addError(err as Error, {
        title: 'Failed to update agentic analysis settings',
      });
    } finally {
      setSaving(false);
    }
  }, [http, notifications, pendingEnabled]);

  const hasChanges = settings !== null && pendingEnabled !== settings.enabled;

  return (
    <>
      <EuiPageHeader pageTitle="Settings" />
      <EuiSpacer size="l" />

      <EuiPanel hasBorder>
        <EuiText>
          <h3>Agentic Analysis</h3>
          <p>
            When enabled, Alerting v2 can automatically trigger AI-powered investigations using
            Agent Builder. An API key will be created under your identity to authorize these
            investigations.
          </p>
        </EuiText>

        <EuiSpacer size="m" />

        <EuiSwitch
          label="Enable agentic analysis"
          checked={pendingEnabled}
          onChange={(e) => setPendingEnabled(e.target.checked)}
          disabled={loading || saving}
        />

        {settings?.enabled && settings.owner && (
          <>
            <EuiSpacer size="m" />
            <EuiCallOut
              title="Agentic analysis is active"
              color="success"
              iconType="check"
              size="s"
            >
              <p>
                Enabled by <strong>{settings.owner}</strong>
                {settings.updatedAt && <> on {new Date(settings.updatedAt).toLocaleString()}</>}
              </p>
            </EuiCallOut>
          </>
        )}

        <EuiSpacer size="l" />

        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={handleSave}
              isLoading={saving}
              disabled={!hasChanges || loading}
            >
              Save
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </>
  );
};
