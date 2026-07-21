/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiAccordion,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiComboBox,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiHorizontalRule,
  EuiIcon,
  EuiIconTip,
  EuiKeyPadMenu,
  EuiKeyPadMenuItem,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTextArea,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  CLOUD_RUN_SA_SECRET_KEY,
  DEFAULT_SANDBOX_POLICY,
  SANDBOX_TIER_PRESETS,
  type SandboxConnection,
  type SandboxConnectorAccess,
  type SandboxEgressMode,
  type SandboxFilesystemMode,
  type SandboxGitPolicy,
  type SandboxProfile,
  type SandboxProfileCreateRequest,
  type SandboxProviderId,
  type SandboxTier,
} from '@kbn/agent-builder-common';
import { useKibana } from '../../hooks/use_kibana';
import { useSandboxProfiles } from '../../hooks/sandboxes/use_sandbox_profiles';
import { FIELD_HELP, LabelWithHelp, TIER_HELP } from './capability_help';
import opencodeLogo from './assets/opencode.svg';
import piLogo from './assets/pi.svg';
import codexLogo from './assets/codex.svg';
import claudeCodeLogo from './assets/claude_code.svg';
import e2bLogo from './assets/e2b.png';
import namespaceLogo from './assets/namespace.svg';

interface Props {
  /** When set, the flyout edits an existing profile instead of creating one. */
  profile?: SandboxProfile;
  onClose: () => void;
}

const LOCAL_K8S_DEFAULTS = {
  kubeContext: 'kind-opencode-sandbox',
  namespace: 'opencode-sandbox',
  image: 'opencode-sandbox:0.1',
};

const CLOUD_RUN_DEFAULTS = {
  project: '',
  region: 'us-central1',
  bridgeUrl: '',
  audience: '',
};

const RUNTIME_DEFAULTS = {
  baseUrl: 'https://elastic.litellm-prod.ai',
  orchestratorModel: 'llm-gateway/claude-sonnet-4-6',
  coderModel: 'llm-gateway/gpt-5.3-codex',
  /** Single model used by the pi runtime (print protocol). */
  piModel: 'llm-gateway/gpt-5.3-codex',
};

type SandboxRuntimeUiId = 'opencode' | 'pi';

interface RuntimeOption {
  id: SandboxRuntimeUiId;
  label: string;
  logo: string;
  hint: string;
  /** When true, the tile is shown grayed-out with a "coming soon" tooltip and is not selectable. */
  comingSoon?: boolean;
}

const RUNTIMES: RuntimeOption[] = [
  {
    id: 'opencode',
    label: i18n.translate('xpack.agentBuilder.sandboxes.runtime.opencode', {
      defaultMessage: 'OpenCode',
    }),
    logo: opencodeLogo,
    hint: i18n.translate('xpack.agentBuilder.sandboxes.runtime.opencodeHint', {
      defaultMessage:
        'ACP-native coding agent. Streams reasoning, tool calls and file edits live, with separate orchestrator and coder models.',
    }),
  },
  {
    id: 'pi',
    label: i18n.translate('xpack.agentBuilder.sandboxes.runtime.pi', {
      defaultMessage: 'pi',
    }),
    logo: piLogo,
    hint: i18n.translate('xpack.agentBuilder.sandboxes.runtime.piHint', {
      defaultMessage:
        'earendil-works/pi coding agent. Installed on first run and driven one-shot per turn via `pi --print`, using a single model.',
    }),
  },
];

/**
 * Runtimes we intend to support but haven't wired yet. Rendered as grayed-out,
 * non-selectable tiles so the roadmap is visible in the UI. `id` is only used as
 * a React key here (these are never selected).
 */
const COMING_SOON_RUNTIMES: Array<{ id: string; label: string; logo: string }> = [
  {
    id: 'codex',
    label: i18n.translate('xpack.agentBuilder.sandboxes.runtime.codex', {
      defaultMessage: 'Codex',
    }),
    logo: codexLogo,
  },
  {
    id: 'claude-code',
    label: i18n.translate('xpack.agentBuilder.sandboxes.runtime.claudeCode', {
      defaultMessage: 'Claude Code',
    }),
    logo: claudeCodeLogo,
  },
];

const PROVIDERS: Array<{ id: SandboxProviderId; label: string; icon: string; hint: string }> = [
  {
    id: 'local-k8s',
    label: i18n.translate('xpack.agentBuilder.sandboxes.provider.localK8s', {
      defaultMessage: 'Local Kubernetes',
    }),
    icon: 'logoKubernetes',
    hint: i18n.translate('xpack.agentBuilder.sandboxes.provider.localK8sHint', {
      defaultMessage: 'A kind/minikube cluster reachable via kubectl. No credentials needed.',
    }),
  },
  {
    id: 'cloud-run',
    label: i18n.translate('xpack.agentBuilder.sandboxes.provider.cloudRun', {
      defaultMessage: 'Google Cloud Run',
    }),
    icon: 'logoGCP',
    hint: i18n.translate('xpack.agentBuilder.sandboxes.provider.cloudRunHint', {
      defaultMessage:
        'gVisor agent sandboxes, reached through a bridge you deploy with --sandbox-launcher. Requires a service-account key.',
    }),
  },
];

/**
 * Compute providers on the roadmap. Rendered as grayed-out, non-selectable tiles
 * next to the supported ones. `logo` is an imported SVG (rendered via <img>);
 * `icon` is an EUI icon type (rendered via <EuiIcon>). Provide exactly one.
 */
const COMING_SOON_PROVIDERS: Array<{
  id: string;
  label: string;
  logo?: string;
  icon?: string;
}> = [
  {
    id: 'e2b',
    label: i18n.translate('xpack.agentBuilder.sandboxes.provider.e2b', {
      defaultMessage: 'E2B',
    }),
    logo: e2bLogo,
  },
  {
    id: 'namespace',
    label: i18n.translate('xpack.agentBuilder.sandboxes.provider.namespace', {
      defaultMessage: 'Namespace',
    }),
    logo: namespaceLogo,
  },
];

const TIERS: Array<{ id: SandboxTier; label: string; icon: string }> = [
  {
    id: 'restricted',
    label: i18n.translate('xpack.agentBuilder.sandboxes.tier.restricted', {
      defaultMessage: 'Restricted',
    }),
    icon: 'lock',
  },
  {
    id: 'investigate',
    label: i18n.translate('xpack.agentBuilder.sandboxes.tier.investigate', {
      defaultMessage: 'Investigate',
    }),
    icon: 'search',
  },
  {
    id: 'contribute',
    label: i18n.translate('xpack.agentBuilder.sandboxes.tier.contribute', {
      defaultMessage: 'Contribute',
    }),
    icon: 'documentEdit',
  },
  {
    id: 'trusted',
    label: i18n.translate('xpack.agentBuilder.sandboxes.tier.trusted', {
      defaultMessage: 'Trusted',
    }),
    icon: 'globe',
  },
];

const COMING_SOON_LABEL = i18n.translate('xpack.agentBuilder.sandboxes.comingSoon', {
  defaultMessage: 'Coming soon',
});

/**
 * Keep all tiles (supported + "coming soon") on a single row. EuiKeyPadMenu has a
 * built-in max-width that fits ~3 items and then wraps/clips the rest, so we lift
 * the cap and force no-wrap, letting it scroll on very narrow flyouts instead of
 * hiding a tile.
 */
const SINGLE_ROW_MENU_CSS = {
  flexWrap: 'nowrap' as const,
  maxWidth: 'none',
  width: '100%',
  overflowX: 'auto' as const,
};

/**
 * A disabled key-pad tile advertising a not-yet-available option. The logo/icon
 * is rendered grayed-out (desaturated + dimmed); the label reads "<name> —
 * Coming soon" and the whole tile has a tooltip. We intentionally avoid EUI's
 * `betaBadgeLabel` here because it collapses to a single-letter circular badge.
 */
const ComingSoonTile: React.FC<{ label: string; logo?: string; icon?: string }> = ({
  label,
  logo,
  icon,
}) => (
  <EuiToolTip position="top" content={COMING_SOON_LABEL}>
    <EuiKeyPadMenuItem
      label={`${label} (${COMING_SOON_LABEL.toLowerCase()})`}
      isDisabled
      data-test-subj={`agentBuilderSandboxComingSoon-${label}`}
    >
      {logo ? (
        <img
          src={logo}
          alt={label}
          style={{ height: 32, maxWidth: 64, filter: 'grayscale(1)', opacity: 0.4 }}
        />
      ) : (
        <EuiIcon type={icon ?? 'wrench'} size="l" css={{ filter: 'grayscale(1)', opacity: 0.4 }} />
      )}
    </EuiKeyPadMenuItem>
  </EuiToolTip>
);

export const CreateSandboxProfileFlyout: React.FC<Props> = ({ profile, onClose }) => {
  const { notifications } = useKibana().services;
  const { createProfile, isCreating, updateProfile, isUpdating } = useSandboxProfiles();
  const isEdit = Boolean(profile);

  const [name, setName] = useState(profile?.name ?? 'Local Kubernetes sandbox');
  const [description, setDescription] = useState(profile?.description ?? '');
  const [provider, setProvider] = useState<SandboxProviderId>(profile?.provider ?? 'local-k8s');

  // local-k8s connection
  const initialK8s = profile?.connection.type === 'local-k8s' ? profile.connection : undefined;
  const [kubeContext, setKubeContext] = useState(
    initialK8s?.kubeContext ?? LOCAL_K8S_DEFAULTS.kubeContext
  );
  const [namespace, setNamespace] = useState(initialK8s?.namespace ?? LOCAL_K8S_DEFAULTS.namespace);
  const [image, setImage] = useState(initialK8s?.image ?? LOCAL_K8S_DEFAULTS.image);

  // cloud-run connection
  const initialCr = profile?.connection.type === 'cloud-run' ? profile.connection : undefined;
  const [project, setProject] = useState(initialCr?.project ?? CLOUD_RUN_DEFAULTS.project);
  const [region, setRegion] = useState(initialCr?.region ?? CLOUD_RUN_DEFAULTS.region);
  const [bridgeUrl, setBridgeUrl] = useState(initialCr?.bridgeUrl ?? CLOUD_RUN_DEFAULTS.bridgeUrl);
  const [audience, setAudience] = useState(initialCr?.audience ?? CLOUD_RUN_DEFAULTS.audience);
  const [saKey, setSaKey] = useState('');

  // runtime
  const [runtime, setRuntime] = useState<SandboxRuntimeUiId>(profile?.runtime ?? 'opencode');
  const [baseUrl, setBaseUrl] = useState(
    profile?.runtimeConfig.baseUrl ?? RUNTIME_DEFAULTS.baseUrl
  );
  const initialOpencode =
    profile?.runtimeConfig.type === 'opencode' ? profile.runtimeConfig : undefined;
  const [orchestratorModel, setOrchestratorModel] = useState(
    initialOpencode?.orchestratorModel ?? RUNTIME_DEFAULTS.orchestratorModel
  );
  const [coderModel, setCoderModel] = useState(
    initialOpencode?.coderModel ?? RUNTIME_DEFAULTS.coderModel
  );
  const initialPi = profile?.runtimeConfig.type === 'pi' ? profile.runtimeConfig : undefined;
  const [piModel, setPiModel] = useState(initialPi?.model ?? RUNTIME_DEFAULTS.piModel);

  // policy
  const [idleTtlMin, setIdleTtlMin] = useState(
    (profile?.policy.idleTtlMs ?? DEFAULT_SANDBOX_POLICY.idleTtlMs) / 60000
  );
  const [maxLifetimeMin, setMaxLifetimeMin] = useState(
    (profile?.policy.maxLifetimeMs ?? DEFAULT_SANDBOX_POLICY.maxLifetimeMs) / 60000
  );
  const [maxRunSeconds, setMaxRunSeconds] = useState(
    profile?.policy.maxRunSeconds ?? DEFAULT_SANDBOX_POLICY.maxRunSeconds
  );

  // capabilities (tier preset + per-axis overrides)
  const [tier, setTier] = useState<SandboxTier>(
    profile?.policy.tier ?? DEFAULT_SANDBOX_POLICY.tier ?? 'investigate'
  );
  const preset = SANDBOX_TIER_PRESETS[tier];
  const [filesystem, setFilesystem] = useState<SandboxFilesystemMode>(
    profile?.policy.filesystem ?? preset.filesystem
  );
  const [allowShell, setAllowShell] = useState<boolean>(
    profile?.policy.allowShell ?? preset.allowShell
  );
  const [egress, setEgress] = useState<SandboxEgressMode>(profile?.policy.egress ?? preset.egress);
  const [egressAllowlist, setEgressAllowlist] = useState<string[]>(
    profile?.policy.egressAllowlist ?? ['github.com']
  );
  const [connectorAccess, setConnectorAccess] = useState<SandboxConnectorAccess>(
    profile?.policy.connectorAccess ?? preset.connectorAccess
  );
  const [gitMode, setGitMode] = useState<SandboxGitPolicy['mode']>(
    profile?.policy.git?.mode ?? preset.git.mode
  );
  const [gitRepos, setGitRepos] = useState<string[]>(profile?.policy.git?.repos ?? []);

  // Picking a tier resets the axes to that tier's preset (advanced users can
  // then override individual axes below). Keeps tier + axes from disagreeing.
  const applyTier = (next: SandboxTier) => {
    setTier(next);
    const p = SANDBOX_TIER_PRESETS[next];
    setFilesystem(p.filesystem);
    setAllowShell(p.allowShell);
    setEgress(p.egress);
    setConnectorAccess(p.connectorAccess);
    setGitMode(p.git.mode);
  };

  const connection: SandboxConnection = useMemo(
    () =>
      provider === 'local-k8s'
        ? { type: 'local-k8s', kubeContext, namespace, image }
        : {
            type: 'cloud-run',
            project,
            region,
            bridgeUrl,
            audience: audience || undefined,
          },
    [provider, kubeContext, namespace, image, project, region, bridgeUrl, audience]
  );

  const valid = useMemo(() => {
    if (!name) return false;
    if (provider === 'local-k8s') return Boolean(kubeContext && namespace && image);
    return Boolean(project && region && bridgeUrl);
  }, [name, provider, kubeContext, namespace, image, project, region, bridgeUrl]);

  const submit = async () => {
    const secretEntries: Record<string, string> = {};
    if (provider === 'cloud-run' && saKey.trim()) {
      secretEntries[CLOUD_RUN_SA_SECRET_KEY] = saKey.trim();
    }
    const secrets = Object.keys(secretEntries).length > 0 ? secretEntries : undefined;
    const policy = {
      tier,
      idleTtlMs: idleTtlMin * 60000,
      maxLifetimeMs: maxLifetimeMin * 60000,
      maxRunSeconds,
      filesystem,
      allowShell,
      egress,
      egressAllowlist: egress === 'allowlist' ? egressAllowlist : undefined,
      connectorAccess,
      git: { mode: gitMode, repos: gitRepos.length > 0 ? gitRepos : undefined },
    };
    const runtimeConfig =
      runtime === 'pi'
        ? { type: 'pi' as const, baseUrl, model: piModel }
        : { type: 'opencode' as const, baseUrl, orchestratorModel, coderModel };

    try {
      if (isEdit && profile) {
        await updateProfile({
          id: profile.id,
          body: {
            name,
            description: description || undefined,
            connection,
            runtimeConfig,
            policy,
          },
        });
        notifications.toasts.addSuccess(
          i18n.translate('xpack.agentBuilder.sandboxes.updated', {
            defaultMessage: 'Sandbox "{name}" updated',
            values: { name },
          })
        );
      } else {
        const body: SandboxProfileCreateRequest = {
          name,
          description: description || undefined,
          provider,
          runtime,
          connection,
          runtimeConfig,
          policy,
          secrets,
        };
        await createProfile(body);
        notifications.toasts.addSuccess(
          i18n.translate('xpack.agentBuilder.sandboxes.created', {
            defaultMessage: 'Sandbox "{name}" connected',
            values: { name },
          })
        );
      }
      onClose();
    } catch (e) {
      notifications.toasts.addError(e as Error, {
        title: i18n.translate('xpack.agentBuilder.sandboxes.saveError', {
          defaultMessage: 'Failed to save sandbox',
        }),
      });
    }
  };

  return (
    <EuiFlyout onClose={onClose} size="m" data-test-subj="agentBuilderCreateSandboxFlyout">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            {isEdit
              ? i18n.translate('xpack.agentBuilder.sandboxes.editTitle', {
                  defaultMessage: 'Edit sandbox',
                })
              : i18n.translate('xpack.agentBuilder.sandboxes.connectTitle', {
                  defaultMessage: 'Connect a sandbox',
                })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiForm component="form">
          <EuiFormRow
            label={i18n.translate('xpack.agentBuilder.sandboxes.field.name', {
              defaultMessage: 'Name',
            })}
          >
            <EuiFieldText
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-test-subj="agentBuilderSandboxNameField"
            />
          </EuiFormRow>
          <EuiFormRow
            label={i18n.translate('xpack.agentBuilder.sandboxes.field.description', {
              defaultMessage: 'Description',
            })}
          >
            <EuiFieldText value={description} onChange={(e) => setDescription(e.target.value)} />
          </EuiFormRow>

          {/* ---- LAYER 1: Compute provider (WHERE code runs) ---- */}
          <EuiSpacer size="l" />
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.agentBuilder.sandboxes.section.compute', {
                defaultMessage: 'Compute provider',
              })}
            </h3>
          </EuiTitle>
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.agentBuilder.sandboxes.section.computeHint', {
              defaultMessage: 'The isolated backend where code runs, and how to reach it.',
            })}
          </EuiText>
          <EuiSpacer size="s" />
          <EuiKeyPadMenu
            css={SINGLE_ROW_MENU_CSS}
            aria-label={i18n.translate('xpack.agentBuilder.sandboxes.providerAria', {
              defaultMessage: 'Compute provider',
            })}
          >
            {PROVIDERS.map((p) => (
              <EuiKeyPadMenuItem
                key={p.id}
                label={p.label}
                isSelected={provider === p.id}
                isDisabled={isEdit}
                onClick={() => setProvider(p.id)}
                data-test-subj={`agentBuilderSandboxProvider-${p.id}`}
              >
                <EuiIcon type={p.icon} size="l" />
              </EuiKeyPadMenuItem>
            ))}
            {COMING_SOON_PROVIDERS.map((p) => (
              <ComingSoonTile key={p.id} label={p.label} logo={p.logo} icon={p.icon} />
            ))}
          </EuiKeyPadMenu>
          <EuiSpacer size="xs" />
          <EuiText size="xs" color="subdued">
            {PROVIDERS.find((p) => p.id === provider)?.hint}
          </EuiText>
          <EuiSpacer size="m" />

          {provider === 'local-k8s' ? (
            <>
              <EuiFlexGroup>
                <EuiFlexItem>
                  <EuiFormRow
                    label={i18n.translate('xpack.agentBuilder.sandboxes.field.kubeContext', {
                      defaultMessage: 'Kube context',
                    })}
                  >
                    <EuiFieldText
                      value={kubeContext}
                      onChange={(e) => setKubeContext(e.target.value)}
                      data-test-subj="agentBuilderSandboxKubeContextField"
                    />
                  </EuiFormRow>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiFormRow
                    label={i18n.translate('xpack.agentBuilder.sandboxes.field.namespace', {
                      defaultMessage: 'Namespace',
                    })}
                  >
                    <EuiFieldText
                      value={namespace}
                      onChange={(e) => setNamespace(e.target.value)}
                    />
                  </EuiFormRow>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiFormRow
                label={i18n.translate('xpack.agentBuilder.sandboxes.field.image', {
                  defaultMessage: 'Container image',
                })}
              >
                <EuiFieldText value={image} onChange={(e) => setImage(e.target.value)} />
              </EuiFormRow>
            </>
          ) : (
            <>
              <EuiFlexGroup>
                <EuiFlexItem>
                  <EuiFormRow
                    label={i18n.translate('xpack.agentBuilder.sandboxes.field.project', {
                      defaultMessage: 'GCP project',
                    })}
                  >
                    <EuiFieldText
                      value={project}
                      onChange={(e) => setProject(e.target.value)}
                      data-test-subj="agentBuilderSandboxProjectField"
                    />
                  </EuiFormRow>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiFormRow
                    label={i18n.translate('xpack.agentBuilder.sandboxes.field.region', {
                      defaultMessage: 'Region',
                    })}
                  >
                    <EuiSelect
                      options={[
                        'us-central1',
                        'us-east1',
                        'europe-west1',
                        'europe-west4',
                        'asia-southeast1',
                      ].map((r) => ({ value: r, text: r }))}
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                    />
                  </EuiFormRow>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiFormRow
                label={i18n.translate('xpack.agentBuilder.sandboxes.field.bridgeUrl', {
                  defaultMessage: 'Bridge URL',
                })}
                helpText={i18n.translate('xpack.agentBuilder.sandboxes.field.bridgeUrlHelp', {
                  defaultMessage:
                    'HTTPS URL of the sandbox bridge you deployed to Cloud Run with --sandbox-launcher.',
                })}
              >
                <EuiFieldText
                  value={bridgeUrl}
                  placeholder="https://opencode-sandbox-bridge-xxxx.run.app"
                  onChange={(e) => setBridgeUrl(e.target.value)}
                  data-test-subj="agentBuilderSandboxBridgeUrlField"
                />
              </EuiFormRow>
              <EuiFormRow
                label={i18n.translate('xpack.agentBuilder.sandboxes.field.audience', {
                  defaultMessage: 'IAM audience (optional)',
                })}
                helpText={i18n.translate('xpack.agentBuilder.sandboxes.field.audienceHelp', {
                  defaultMessage:
                    'Usually the same as the Bridge URL. Leave blank for an unauthenticated (dev) bridge.',
                })}
              >
                <EuiFieldText value={audience} onChange={(e) => setAudience(e.target.value)} />
              </EuiFormRow>
              <EuiFormRow
                label={i18n.translate('xpack.agentBuilder.sandboxes.field.saKey', {
                  defaultMessage: 'Service-account key (JSON)',
                })}
                helpText={
                  isEdit
                    ? i18n.translate('xpack.agentBuilder.sandboxes.field.saKeyEditHelp', {
                        defaultMessage:
                          'Stored encrypted. Leave blank to keep the existing key (recreate the sandbox to change it).',
                      })
                    : i18n.translate('xpack.agentBuilder.sandboxes.field.saKeyHelp', {
                        defaultMessage:
                          'Stored encrypted, never returned to the browser. Needs the Cloud Run Invoker role on the bridge.',
                      })
                }
              >
                <EuiTextArea
                  value={saKey}
                  onChange={(e) => setSaKey(e.target.value)}
                  placeholder='{ "type": "service_account", ... }'
                  rows={4}
                  data-test-subj="agentBuilderSandboxSaKeyField"
                />
              </EuiFormRow>
            </>
          )}

          {/* ---- LAYER 2: Coding runtime (WHAT runs inside) ---- */}
          <EuiHorizontalRule margin="l" />
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.agentBuilder.sandboxes.section.runtime', {
                defaultMessage: 'Coding runtime',
              })}
            </h3>
          </EuiTitle>
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.agentBuilder.sandboxes.section.runtimeHint', {
              defaultMessage:
                'The coding agent that runs inside the sandbox, and its model routing. OpenCode streams over ACP; pi runs one-shot per turn.',
            })}
          </EuiText>
          <EuiSpacer size="s" />
          <EuiKeyPadMenu
            css={SINGLE_ROW_MENU_CSS}
            aria-label={i18n.translate('xpack.agentBuilder.sandboxes.runtimeAria', {
              defaultMessage: 'Coding runtime',
            })}
          >
            {RUNTIMES.map((r) => (
              <EuiKeyPadMenuItem
                key={r.id}
                label={r.label}
                isSelected={runtime === r.id}
                onClick={() => setRuntime(r.id)}
                data-test-subj={`agentBuilderSandboxRuntime-${r.id}`}
              >
                <img src={r.logo} alt={r.label} style={{ height: 32, maxWidth: 64 }} />
              </EuiKeyPadMenuItem>
            ))}
            {COMING_SOON_RUNTIMES.map((r) => (
              <ComingSoonTile key={r.id} label={r.label} logo={r.logo} />
            ))}
          </EuiKeyPadMenu>
          <EuiSpacer size="xs" />
          <EuiText size="xs" color="subdued">
            {RUNTIMES.find((r) => r.id === runtime)?.hint}
          </EuiText>
          <EuiSpacer size="m" />
          <EuiFormRow
            label={i18n.translate('xpack.agentBuilder.sandboxes.field.baseUrl', {
              defaultMessage: 'Model gateway base URL',
            })}
          >
            <EuiFieldText value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
          </EuiFormRow>
          {runtime === 'opencode' ? (
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiFormRow
                  label={i18n.translate('xpack.agentBuilder.sandboxes.field.orchestrator', {
                    defaultMessage: 'Orchestrator model',
                  })}
                >
                  <EuiFieldText
                    value={orchestratorModel}
                    onChange={(e) => setOrchestratorModel(e.target.value)}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFormRow
                  label={i18n.translate('xpack.agentBuilder.sandboxes.field.coder', {
                    defaultMessage: 'Coder model',
                  })}
                >
                  <EuiFieldText
                    value={coderModel}
                    onChange={(e) => setCoderModel(e.target.value)}
                  />
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : (
            <EuiFormRow
              label={i18n.translate('xpack.agentBuilder.sandboxes.field.piModel', {
                defaultMessage: 'Model',
              })}
              helpText={i18n.translate('xpack.agentBuilder.sandboxes.field.piModelHelp', {
                defaultMessage: 'pi is installed on first run and driven via `pi --print`.',
              })}
            >
              <EuiFieldText value={piModel} onChange={(e) => setPiModel(e.target.value)} />
            </EuiFormRow>
          )}

          {/* ---- Capabilities (permission tier + advanced axes) ---- */}
          <EuiHorizontalRule margin="l" />
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs">
                <h3>
                  {i18n.translate('xpack.agentBuilder.sandboxes.section.capabilities', {
                    defaultMessage: 'Capabilities',
                  })}
                </h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiIconTip
                content={FIELD_HELP.tier}
                position="top"
                type="question"
                color="subdued"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.agentBuilder.sandboxes.section.capabilitiesHint', {
              defaultMessage:
                'How much the coding sub-agent is allowed to do. Least privilege by default; escalate explicitly. Hover a tier to see what it grants.',
            })}
          </EuiText>
          <EuiSpacer size="s" />
          <EuiFlexGroup
            gutterSize="s"
            responsive={false}
            wrap={false}
            aria-label={i18n.translate('xpack.agentBuilder.sandboxes.tierAria', {
              defaultMessage: 'Capability tier',
            })}
          >
            {TIERS.map((t) => (
              <EuiFlexItem key={t.id} grow={false}>
                <EuiToolTip position="top" content={TIER_HELP[t.id]}>
                  <EuiKeyPadMenuItem
                    label={t.label}
                    isSelected={tier === t.id}
                    onClick={() => applyTier(t.id)}
                    data-test-subj={`agentBuilderSandboxTier-${t.id}`}
                  >
                    <EuiIcon type={t.icon} size="l" />
                  </EuiKeyPadMenuItem>
                </EuiToolTip>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
          <EuiSpacer size="xs" />
          <EuiText size="xs" color="subdued">
            {TIER_HELP[tier]}
          </EuiText>
          {tier === 'trusted' && (
            <>
              <EuiSpacer size="s" />
              <EuiCallOut
                size="s"
                color="warning"
                iconType="warning"
                title={i18n.translate('xpack.agentBuilder.sandboxes.trustedWarning', {
                  defaultMessage:
                    'Trusted grants open egress and full capability. Only use for local/single-tenant development.',
                })}
              />
            </>
          )}
          <EuiSpacer size="s" />
          <EuiAccordion
            id="sandboxCapabilitiesAdvanced"
            buttonContent={i18n.translate('xpack.agentBuilder.sandboxes.advancedCaps', {
              defaultMessage: 'Advanced: override individual capabilities',
            })}
          >
            <EuiSpacer size="s" />
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiFormRow
                  label={<LabelWithHelp label="Filesystem" help={FIELD_HELP.filesystem} />}
                >
                  <EuiSelect
                    options={[
                      { value: 'ephemeral-rw', text: 'Ephemeral, writable' },
                      { value: 'ephemeral-ro', text: 'Ephemeral, read-only root' },
                    ]}
                    value={filesystem}
                    onChange={(e) => setFilesystem(e.target.value as SandboxFilesystemMode)}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFormRow
                  label={<LabelWithHelp label="Network egress" help={FIELD_HELP.egress} />}
                >
                  <EuiSelect
                    options={[
                      { value: 'deny', text: 'Deny (model gateway only)' },
                      { value: 'allowlist', text: 'Allowlist' },
                      { value: 'open', text: 'Open' },
                    ]}
                    value={egress}
                    onChange={(e) => setEgress(e.target.value as SandboxEgressMode)}
                  />
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>
            {egress === 'allowlist' && (
              <EuiFormRow
                label={i18n.translate('xpack.agentBuilder.sandboxes.field.egressAllowlist', {
                  defaultMessage: 'Allowed egress hosts',
                })}
                helpText={i18n.translate('xpack.agentBuilder.sandboxes.field.egressAllowlistHelp', {
                  defaultMessage:
                    'The model gateway and MCP loopback are always allowed. Add hosts like github.com.',
                })}
              >
                <EuiComboBox
                  noSuggestions
                  placeholder="github.com"
                  selectedOptions={egressAllowlist.map((h) => ({ label: h }))}
                  onCreateOption={(v) => setEgressAllowlist((cur) => [...cur, v.trim()])}
                  onChange={(opts) => setEgressAllowlist(opts.map((o) => o.label))}
                />
              </EuiFormRow>
            )}
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiFormRow
                  label={<LabelWithHelp label="Connector access" help={FIELD_HELP.connectors} />}
                >
                  <EuiSelect
                    options={[
                      { value: 'none', text: 'None' },
                      { value: 'read', text: 'Read-only' },
                      { value: 'write', text: 'Read + write' },
                    ]}
                    value={connectorAccess}
                    onChange={(e) => setConnectorAccess(e.target.value as SandboxConnectorAccess)}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFormRow label={<LabelWithHelp label="Git access" help={FIELD_HELP.git} />}>
                  <EuiSelect
                    options={[
                      { value: 'none', text: 'None' },
                      { value: 'clone-ro', text: 'Clone (read-only)' },
                      { value: 'push-pr', text: 'Push + open PR' },
                    ]}
                    value={gitMode}
                    onChange={(e) => setGitMode(e.target.value as SandboxGitPolicy['mode'])}
                  />
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>
            {gitMode !== 'none' && (
              <EuiFormRow
                label={
                  <LabelWithHelp
                    label={i18n.translate('xpack.agentBuilder.sandboxes.field.gitRepos', {
                      defaultMessage: 'Git repositories',
                    })}
                    help={i18n.translate('xpack.agentBuilder.sandboxes.field.gitReposHelp', {
                      defaultMessage:
                        'owner/repo the sandbox may touch (e.g. shahargl/kibana). Scopes the minted GitHub App token to exactly these repos.',
                    })}
                  />
                }
              >
                <EuiComboBox
                  noSuggestions
                  placeholder="shahargl/kibana"
                  selectedOptions={gitRepos.map((r) => ({ label: r }))}
                  onCreateOption={(v) => setGitRepos((prev) => [...prev, v.trim()])}
                  onChange={(opts) => setGitRepos(opts.map((o) => o.label))}
                />
              </EuiFormRow>
            )}
            <EuiFormRow>
              <EuiSwitch
                label={
                  <LabelWithHelp
                    label={i18n.translate('xpack.agentBuilder.sandboxes.field.allowShell', {
                      defaultMessage: 'Allow arbitrary shell commands',
                    })}
                    help={FIELD_HELP.allowShell}
                  />
                }
                checked={allowShell}
                onChange={(e) => setAllowShell(e.target.checked)}
              />
            </EuiFormRow>
          </EuiAccordion>

          {/* ---- Lifecycle policy ---- */}
          <EuiHorizontalRule margin="l" />
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.agentBuilder.sandboxes.section.policy', {
                defaultMessage: 'Lifecycle policy',
              })}
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.agentBuilder.sandboxes.policyHint', {
              defaultMessage:
                'A sandbox stays warm per conversation, reaped after idle TTL or the hard max lifetime.',
            })}
          </EuiText>
          <EuiSpacer size="s" />
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiFormRow
                label={
                  <LabelWithHelp
                    label={i18n.translate('xpack.agentBuilder.sandboxes.field.idleTtl', {
                      defaultMessage: 'Idle TTL (min)',
                    })}
                    help={FIELD_HELP.idleTtl}
                  />
                }
              >
                <EuiFieldNumber
                  min={1}
                  value={idleTtlMin}
                  onChange={(e) => setIdleTtlMin(Number(e.target.value))}
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFormRow
                label={
                  <LabelWithHelp
                    label={i18n.translate('xpack.agentBuilder.sandboxes.field.maxLifetime', {
                      defaultMessage: 'Max lifetime (min)',
                    })}
                    help={FIELD_HELP.maxLifetime}
                  />
                }
              >
                <EuiFieldNumber
                  min={1}
                  value={maxLifetimeMin}
                  onChange={(e) => setMaxLifetimeMin(Number(e.target.value))}
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFormRow
                label={
                  <LabelWithHelp
                    label={i18n.translate('xpack.agentBuilder.sandboxes.field.maxRun', {
                      defaultMessage: 'Max run (sec)',
                    })}
                    help={FIELD_HELP.maxRun}
                  />
                }
              >
                <EuiFieldNumber
                  min={60}
                  value={maxRunSeconds}
                  onChange={(e) => setMaxRunSeconds(Number(e.target.value))}
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>

          {provider === 'cloud-run' && (
            <>
              <EuiSpacer size="m" />
              <EuiCallOut
                size="s"
                color="primary"
                iconType="iInCircle"
                title={i18n.translate('xpack.agentBuilder.sandboxes.cloudRunNote', {
                  defaultMessage:
                    'Cloud Run needs a bridge service deployed with --sandbox-launcher. Use "Test" after saving to verify auth and reachability.',
                })}
              />
            </>
          )}
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose}>
              {i18n.translate('xpack.agentBuilder.sandboxes.cancel', { defaultMessage: 'Cancel' })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={submit}
              isLoading={isCreating || isUpdating}
              disabled={!valid}
              data-test-subj="agentBuilderSaveSandboxButton"
            >
              {isEdit
                ? i18n.translate('xpack.agentBuilder.sandboxes.save', {
                    defaultMessage: 'Save changes',
                  })
                : i18n.translate('xpack.agentBuilder.sandboxes.connect', {
                    defaultMessage: 'Connect',
                  })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
