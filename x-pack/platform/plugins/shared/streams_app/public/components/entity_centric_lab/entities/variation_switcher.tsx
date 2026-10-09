/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Floating bottom-right popover that lets you switch between prototype
 * variations (data profiles, UI alternatives, …). ElasticOn-only.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonGroup,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiPopover,
  EuiPopoverTitle,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';

import { useKibana } from '../../../hooks/use_kibana';
import { useVariationContext } from './variation_context';
import type { VariationDimension } from './variation_registry';

/**
 * Lab prototype build number shown in the variation selector.
 * Bump by 0.01 on each prototype push (e.g. 1.00 → 1.01 → 1.02).
 */
export const PROTOTYPE_VERSION = '1.00';

// ---------------------------------------------------------------------------
// Per-dimension row
// ---------------------------------------------------------------------------

const DimensionRow = ({
  dimension,
  activeOptionId,
  onChange,
}: {
  dimension: VariationDimension;
  activeOptionId: string;
  onChange: (dimensionId: string, optionId: string) => void;
}) => {
  const buttonGroupOptions = useMemo(
    () =>
      dimension.options.map((opt) => ({
        id: opt.id,
        label: opt.label,
      })),
    [dimension.options]
  );

  const handleChange = useCallback(
    (optionId: string) => onChange(dimension.id, optionId),
    [dimension.id, onChange]
  );

  const activeDescription = dimension.options.find(
    (opt) => opt.id === activeOptionId
  )?.description;

  return (
    <EuiFormRow label={dimension.label} fullWidth>
      <>
        <EuiButtonGroup
          legend={dimension.label}
          options={buttonGroupOptions}
          idSelected={activeOptionId}
          onChange={handleChange}
          buttonSize="compressed"
          isFullWidth
        />
        {activeDescription ? (
          <EuiText size="xs" color="subdued" css={css`margin-top: 4px;`}>
            <p>{activeDescription}</p>
          </EuiText>
        ) : null}
      </>
    </EuiFormRow>
  );
};

// ---------------------------------------------------------------------------
// Seed K8s demo data button
// ---------------------------------------------------------------------------

const SeedDemoDataButton = () => {
  const { core } = useKibana();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<string>('');

  const handleSeed = useCallback(async () => {
    setStatus('loading');
    setResult('');
    try {
      const resp = await core.http.post<{
        success: boolean;
        indexed: number;
        failed: number;
        hours: number;
        topology: {
          clusters: number;
          nodes: number;
          namespaces: number;
          deployments: number;
          pods: number;
        };
      }>('/internal/streams/entity_centric_lab/seed_k8s_data', {
        body: JSON.stringify({ hours: 8, intervalMinutes: 5, deleteExisting: true }),
      });
      if (resp.success) {
        setStatus('success');
        setResult(
          `${resp.indexed.toLocaleString()} docs over ${resp.hours}h — ` +
            `${resp.topology.clusters} clusters, ${resp.topology.nodes} nodes, ` +
            `${resp.topology.namespaces} ns, ${resp.topology.deployments} deploys, ` +
            `${resp.topology.pods} pods`
        );
      } else {
        setStatus('error');
        setResult(`${resp.indexed} ok, ${resp.failed} failed`);
      }
    } catch (e) {
      setStatus('error');
      setResult(e instanceof Error ? e.message : 'Unknown error');
    }
  }, [core.http]);

  return (
    <>
      <EuiHorizontalRule margin="s" />
      <EuiFormRow
        label="K8s dashboard data"
        fullWidth
        helpText={
          result ? (
            <EuiText size="xs" color={status === 'error' ? 'danger' : 'success'}>
              <p>{result}</p>
            </EuiText>
          ) : (
            <EuiText size="xs" color="subdued">
              <p>Seeds K8s resources with active alerts, including deployments.</p>
            </EuiText>
          )
        }
      >
        <EuiButton
          size="s"
          fullWidth
          iconType="importAction"
          isLoading={status === 'loading'}
          color={status === 'success' ? 'success' : 'primary'}
          onClick={handleSeed}
        >
          {status === 'loading'
            ? 'Seeding…'
            : status === 'success'
            ? 'Seeded ✓'
            : 'Seed demo data'}
        </EuiButton>
      </EuiFormRow>
    </>
  );
};

// ---------------------------------------------------------------------------
// Reset prototype state
// ---------------------------------------------------------------------------

/**
 * Purge all prototype-owned localStorage and sessionStorage keys, then
 * hard-reload. Every key we write is prefixed with `entityCentricLab.`,
 * `entityCentricLab_`, or `elasticOn_`, so the wipe is surgical.
 */
const resetPrototypeState = (): void => {
  const prefixes = ['entityCentricLab.', 'entityCentricLab_', 'elasticOn_'];
  const isOurs = (key: string) => prefixes.some((p) => key.startsWith(p));
  try {
    const lsKeys = Object.keys(localStorage).filter(isOurs);
    for (const key of lsKeys) localStorage.removeItem(key);
    const ssKeys = Object.keys(sessionStorage).filter(isOurs);
    for (const key of ssKeys) sessionStorage.removeItem(key);
  } catch {
    // Storage unavailable — the reload will still help.
  }
  window.location.reload();
};

const ResetPrototypeStateButton = () => (
  <>
    <EuiHorizontalRule margin="s" />
    <EuiFormRow
      label="Prototype state"
      fullWidth
      helpText={
        <EuiText size="xs" color="subdued">
          <p>Clears lab storage (saved views, tour flags, scenario progress) and reloads.</p>
        </EuiText>
      }
    >
      <EuiButton
        size="s"
        fullWidth
        iconType="refresh"
        color="text"
        onClick={resetPrototypeState}
        data-test-subj="entityCentricLabResetPrototypeState"
      >
        Reset prototype state
      </EuiButton>
    </EuiFormRow>
  </>
);

// ---------------------------------------------------------------------------
// Floating switcher button + popover
// ---------------------------------------------------------------------------

export const VariationSwitcher = () => {
  const { euiTheme } = useEuiTheme();
  const { get, set, isAtDefault, dimensions } = useVariationContext();
  const [isOpen, setIsOpen] = useState(false);

  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);
  const close = useCallback(() => setIsOpen(false), []);

  // Highlight the button when any dimension is non-default, so the user
  // knows the prototype is in a non-standard configuration.
  const hasNonDefault = dimensions.some((dim) => !isAtDefault(dim.id));

  return (
    <div
      css={css`
        position: fixed;
        bottom: ${euiTheme.size.l};
        right: ${euiTheme.size.l};
        z-index: ${euiTheme.levels.flyout - 1};
      `}
    >
      <EuiPopover
        button={
          <EuiButtonIcon
            iconType="beaker"
            aria-label="Prototype variations"
            display={hasNonDefault ? 'fill' : 'base'}
            color={hasNonDefault ? 'accent' : 'text'}
            size="m"
            onClick={toggle}
            css={css`
              border-radius: 50%;
              box-shadow: ${euiTheme.levels.flyout > 0
                ? `0 2px 8px ${euiTheme.colors.shadow}`
                : 'none'};
            `}
          />
        }
        isOpen={isOpen}
        closePopover={close}
        anchorPosition="upRight"
        panelPaddingSize="m"
        css={css`
          & .euiPopover__anchor {
            display: flex;
          }
        `}
      >
        <EuiPopoverTitle>
          <EuiFlexGroup
            alignItems="baseline"
            justifyContent="spaceBetween"
            gutterSize="s"
            responsive={false}
          >
            <EuiFlexItem grow={false}>Prototype variations</EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                <span data-test-subj="entityCentricLabPrototypeVersion">
                  v{PROTOTYPE_VERSION}
                </span>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPopoverTitle>
        <EuiFlexGroup
          direction="column"
          gutterSize="m"
          css={css`
            min-width: 280px;
          `}
        >
          {dimensions.map((dim) => (
            <EuiFlexItem key={dim.id} grow={false}>
              <DimensionRow
                dimension={dim}
                activeOptionId={get(dim.id)}
                onChange={set}
              />
            </EuiFlexItem>
          ))}
          <EuiFlexItem grow={false}>
            <SeedDemoDataButton />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ResetPrototypeStateButton />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPopover>
    </div>
  );
};
