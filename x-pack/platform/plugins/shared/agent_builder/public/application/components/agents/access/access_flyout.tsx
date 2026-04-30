/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import {
  type AgentAcl,
  type AgentAclEntry,
  type AgentDefinition,
} from '@kbn/agent-builder-common';
import { AccessForm } from './access_form';
import { useAgentAcl } from '../../../hooks/agents/use_agent_acl';
import { useUpdateAgentAcl } from '../../../hooks/agents/use_update_agent_acl';
import {
  accessFlyoutCancel,
  accessFlyoutConflictError,
  accessFlyoutSave,
  accessFlyoutSaveError,
  accessFlyoutTitle,
} from './access_i18n';

interface AccessFlyoutProps {
  agent: AgentDefinition;
  onClose: () => void;
}

const aclSignature = (acl: { entries: AgentAclEntry[]; version: number }): string =>
  JSON.stringify({
    version: acl.version,
    entries: [...acl.entries]
      .map((e) => ({ type: e.type, name: e.name, role: e.role }))
      .sort((a, b) => `${a.type}:${a.name}`.localeCompare(`${b.type}:${b.name}`)),
  });

export const AccessFlyout: React.FC<AccessFlyoutProps> = ({ agent, onClose }) => {
  const flyoutTitleId = `agentBuilderAclFlyoutTitle_${agent.id}`;

  const { data, isLoading, isError, refetch } = useAgentAcl(agent.id);
  const [draft, setDraft] = useState<AgentAcl | null>(null);
  const [saveError, setSaveError] = useState<{ conflict: boolean; message: string } | null>(null);

  useEffect(() => {
    if (data?.acl && draft === null) {
      setDraft(data.acl);
    }
  }, [data, draft]);

  const updateMutation = useUpdateAgentAcl({
    agentId: agent.id,
    onSuccess: () => {
      setSaveError(null);
      onClose();
    },
    onError: (err: Error & { body?: { statusCode?: number; message?: string } }) => {
      const status = err.body?.statusCode ?? (err as { response?: { status?: number } }).response?.status;
      setSaveError({
        conflict: status === 409,
        message: err.body?.message ?? err.message ?? '',
      });
      // Pull latest version on conflict so the user can retry without reopening.
      if (status === 409) {
        refetch();
      }
    },
  });

  const isBusy = isLoading || updateMutation.isLoading;
  const isDirty = draft !== null && data?.acl != null && aclSignature(draft) !== aclSignature(data.acl);

  const handleSave = () => {
    if (!draft) return;
    setSaveError(null);
    updateMutation.mutate({ version: draft.version, entries: draft.entries });
  };

  const renderBody = () => {
    if (isLoading || draft === null) {
      return (
        <EuiFlexGroup justifyContent="center" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="l" />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }
    if (isError || !data) {
      return (
        <EuiCallOut color="danger" iconType="alert" title={accessFlyoutSaveError} />
      );
    }
    if (!data.canManage) {
      return (
        <EuiCallOut color="primary" iconType="lock" title={accessFlyoutSaveError}>
          {/* The list of principals is hidden for users without manage rights to avoid leaking
              sensitive membership information. */}
        </EuiCallOut>
      );
    }
    return (
      <>
        {saveError ? (
          <>
            <EuiCallOut color="danger" iconType="alert" title={accessFlyoutSaveError}>
              {saveError.conflict ? accessFlyoutConflictError : saveError.message}
            </EuiCallOut>
            <EuiSpacer size="m" />
          </>
        ) : null}
        <AccessForm
          visibility={agent.visibility}
          entries={draft.entries}
          isDisabled={updateMutation.isLoading}
          onChange={(entries) => setDraft((prev) => (prev ? { ...prev, entries } : prev))}
        />
      </>
    );
  };

  return (
    <EuiFlyout
      onClose={onClose}
      ownFocus
      aria-labelledby={flyoutTitleId}
      data-test-subj="agentBuilderAclFlyout"
      size="m"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={flyoutTitleId}>{accessFlyoutTitle}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>{renderBody()}</EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} disabled={updateMutation.isLoading}>
              {accessFlyoutCancel}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={handleSave}
              isLoading={updateMutation.isLoading}
              isDisabled={!isDirty || isBusy || !data?.canManage}
              data-test-subj="agentBuilderAclSaveButton"
            >
              {accessFlyoutSave}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
