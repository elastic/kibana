/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIconTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  SandboxConnectorAccess,
  SandboxEgressMode,
  SandboxFilesystemMode,
  SandboxGitPolicy,
  SandboxTier,
} from '@kbn/agent-builder-common';

/**
 * Single source of truth for the "what does this mean?" copy used across the
 * sandbox surfaces (create/edit flyout, detail flyout, per-agent page). Keeping
 * it here means a field's tooltip reads the same everywhere.
 */
export const FIELD_HELP: Record<string, string> = {
  provider: i18n.translate('xpack.agentBuilder.sandboxes.help.provider', {
    defaultMessage:
      'The isolated compute backend where the coding sub-agent runs. Local Kubernetes runs pods on a kind/minikube cluster; Cloud Run runs gVisor sandboxes via a bridge you deploy.',
  }),
  runtime: i18n.translate('xpack.agentBuilder.sandboxes.help.runtime', {
    defaultMessage:
      'The coding agent that runs inside the sandbox. OpenCode streams reasoning, tool calls and file edits live over ACP; pi runs one-shot per turn via `pi --print`.',
  }),
  model: i18n.translate('xpack.agentBuilder.sandboxes.help.model', {
    defaultMessage:
      'The LLM the coding agent uses to write code, routed through the model gateway (LiteLLM).',
  }),
  tier: i18n.translate('xpack.agentBuilder.sandboxes.help.tier', {
    defaultMessage:
      'A named permission preset over the four capability axes (filesystem, egress, connectors, git). Least-privilege by default; escalate explicitly.',
  }),
  filesystem: i18n.translate('xpack.agentBuilder.sandboxes.help.filesystem', {
    defaultMessage:
      'Filesystem posture inside the sandbox. Ephemeral means nothing survives teardown. Read-only root locks the OS so only the /workspace directory is writable.',
  }),
  egress: i18n.translate('xpack.agentBuilder.sandboxes.help.egress', {
    defaultMessage:
      'Outbound network the sandbox may reach. The model gateway and MCP loopback are always allowed; everything else is governed here.',
  }),
  connectors: i18n.translate('xpack.agentBuilder.sandboxes.help.connectors', {
    defaultMessage:
      'How the coding agent may use your Kibana connectors, enforced by the credential broker via a short-lived scoped API key. Secrets never enter the sandbox.',
  }),
  git: i18n.translate('xpack.agentBuilder.sandboxes.help.git', {
    defaultMessage:
      'Repository capability. Private clone and push use a short-lived token minted by the broker on the host; the long-lived credential never enters the sandbox.',
  }),
  allowShell: i18n.translate('xpack.agentBuilder.sandboxes.help.allowShell', {
    defaultMessage: 'Whether the coding agent may run arbitrary shell commands inside the sandbox.',
  }),
  idleTtl: i18n.translate('xpack.agentBuilder.sandboxes.help.idleTtl', {
    defaultMessage:
      'A warm sandbox is reused across turns of a conversation, then reaped after this much inactivity.',
  }),
  maxLifetime: i18n.translate('xpack.agentBuilder.sandboxes.help.maxLifetime', {
    defaultMessage:
      'Hard cap on a sandbox\u2019s lifetime regardless of activity, so nothing lingers forever.',
  }),
  maxRun: i18n.translate('xpack.agentBuilder.sandboxes.help.maxRun', {
    defaultMessage: 'Wall-clock budget for a single coding turn before it is cancelled.',
  }),
};

/** Per-tier one-liners, reused by the picker tooltips and detail views. */
export const TIER_HELP: Record<SandboxTier, string> = {
  restricted: i18n.translate('xpack.agentBuilder.sandboxes.help.tier.restricted', {
    defaultMessage:
      'Deny-all egress (except the model gateway), no connectors, no git. Just runs code in isolation.',
  }),
  investigate: i18n.translate('xpack.agentBuilder.sandboxes.help.tier.investigate', {
    defaultMessage:
      'Egress allowlist, read-only clone, read-only connectors. No writes anywhere. A safe default.',
  }),
  contribute: i18n.translate('xpack.agentBuilder.sandboxes.help.tier.contribute', {
    defaultMessage:
      'Adds push-branch / open-PR (via a broker-scoped token) and write-capable connectors. The "open a fix" tier.',
  }),
  trusted: i18n.translate('xpack.agentBuilder.sandboxes.help.tier.trusted', {
    defaultMessage:
      'Open egress and full capability. For local / single-tenant development only \u2014 least isolated.',
  }),
};

/** Human-readable meaning for each axis value, shown next to the value on hover. */
export const VALUE_HELP: {
  filesystem: Record<SandboxFilesystemMode, string>;
  egress: Record<SandboxEgressMode, string>;
  connectors: Record<SandboxConnectorAccess, string>;
  git: Record<SandboxGitPolicy['mode'], string>;
} = {
  filesystem: {
    'ephemeral-rw': i18n.translate('xpack.agentBuilder.sandboxes.help.fs.rw', {
      defaultMessage: 'Writable workspace; discarded on teardown.',
    }),
    'ephemeral-ro': i18n.translate('xpack.agentBuilder.sandboxes.help.fs.ro', {
      defaultMessage: 'Read-only OS; only /workspace is writable. Discarded on teardown.',
    }),
  },
  egress: {
    deny: i18n.translate('xpack.agentBuilder.sandboxes.help.egress.deny', {
      defaultMessage: 'No outbound network except the model gateway + MCP loopback.',
    }),
    allowlist: i18n.translate('xpack.agentBuilder.sandboxes.help.egress.allowlist', {
      defaultMessage: 'Only the listed hosts (plus the always-allowed gateway + loopback).',
    }),
    open: i18n.translate('xpack.agentBuilder.sandboxes.help.egress.open', {
      defaultMessage: 'Unrestricted outbound network.',
    }),
  },
  connectors: {
    none: i18n.translate('xpack.agentBuilder.sandboxes.help.conn.none', {
      defaultMessage: 'The sandbox cannot call Kibana connectors.',
    }),
    read: i18n.translate('xpack.agentBuilder.sandboxes.help.conn.read', {
      defaultMessage: 'Read-only connector sub-actions (e.g. fetch a case, query an index).',
    }),
    write: i18n.translate('xpack.agentBuilder.sandboxes.help.conn.write', {
      defaultMessage: 'Read + write connector sub-actions (e.g. open a case, post to Slack).',
    }),
  },
  git: {
    none: i18n.translate('xpack.agentBuilder.sandboxes.help.git.none', {
      defaultMessage: 'No repository access.',
    }),
    'clone-ro': i18n.translate('xpack.agentBuilder.sandboxes.help.git.clone', {
      defaultMessage: 'Clone repositories read-only. Cannot push.',
    }),
    'push-pr': i18n.translate('xpack.agentBuilder.sandboxes.help.git.push', {
      defaultMessage: 'Clone, push a branch, and open a pull request via a broker-scoped token.',
    }),
  },
};

/**
 * A label with a trailing `?` info icon that explains the field on hover. Use
 * as a `EuiDescriptionList` title or an `EuiFormRow` label. The label text is
 * left as-is (a bare span) so it inherits the surrounding element's styling —
 * e.g. the bold `<dt>` of a description list — instead of being re-styled by an
 * `EuiText`, which would make help-labelled rows look different from plain ones.
 */
export const LabelWithHelp: React.FC<{ label: string; help: React.ReactNode }> = ({
  label,
  help,
}) => (
  <EuiFlexGroup
    gutterSize="xs"
    alignItems="center"
    responsive={false}
    component="span"
    css={{ display: 'inline-flex' }}
  >
    <EuiFlexItem grow={false}>
      <span>{label}</span>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiIconTip content={help} position="top" type="question" color="subdued" />
    </EuiFlexItem>
  </EuiFlexGroup>
);
