/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { EuiButton } from '@elastic/eui';
import type { SerializedPolicy } from '@kbn/index-lifecycle-management-common-shared';
import {
  InspectIlmPolicyFlyout,
  buildDataLifecycleApplyPayload,
  buildFailedDataLifecycleApplyPayload,
  type IlmPolicyForFlyout,
  type InspectIlmPolicyFlyoutPrimaryAction,
} from '@kbn/data-lifecycle-phases';
import { EditDataLifecycleFlyout } from '../edit_data_lifecycle_flyout';
import type { EditDataLifecycleFlyoutOnApplyArgs } from '../edit_data_lifecycle_flyout';
import type { DlmPhaseDuration } from '../../dlm_phases_selector';

// ---------------------------------------------------------------------------
// Fixture data
// ---------------------------------------------------------------------------

const BASE_POLICIES: SerializedPolicy[] = [
  {
    name: '.alerts-ilm-policy',
    phases: {
      hot: { min_age: '0ms', actions: { rollover: { max_age: '7d' } } },
      warm: { min_age: '7d', actions: { downsample: { fixed_interval: '1h' } } },
      cold: { min_age: '30d', actions: { downsample: { fixed_interval: '1d' } } },
      delete: { min_age: '60d', actions: { delete: {} } },
    },
  },
  {
    name: '.dolor-sit-amet',
    phases: {
      hot: { min_age: '0ms', actions: { rollover: { max_age: '30d' } } },
      warm: { min_age: '30d', actions: {} },
      delete: { min_age: '60d', actions: { delete: {} } },
    },
  },
  {
    name: '.amet-ipsum-dolor',
    phases: {
      hot: { min_age: '0ms', actions: { rollover: { max_age: '30d' } } },
    },
  },
];

const POLICIES: IlmPolicyForFlyout[] = BASE_POLICIES.map((p) => ({
  name: p.name,
  phases: p.phases,
  serializedPolicy: p,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_DELETE_PHASE: DlmPhaseDuration = { enabled: false, value: '60', unit: 'd' };

/** Shared DLM props — mirrors what a real consumer would derive from core/cloud services. */
const DLM_PROPS = {
  hasEnterpriseLicense: true,
  hasDefaultSnapshotRepository: true,
  defaultSnapshotRepository: 'found-snapshots',
  manageRepositoriesUrl: '/app/management/data/snapshot_restore/repositories',
  createDefaultRepositoryUrl: '/app/management/data/snapshot_restore/add_repository',
  canCreateDefaultSnapshotRepository: true,
  enterprise: {
    isCloudEnabled: true,
    canManageLicense: true,
    trialDaysLeft: undefined,
    onUpgrade: action('enterprise.onUpgrade'),
    subscriptionFeaturesUrl: 'https://www.elastic.co/subscriptions/cloud',
  },
} as const;

/**
 * Renders InspectIlmPolicyFlyout when a policy is being inspected.
 * The primaryAction prop is provided by the caller so the flyout's CTA
 * matches the parent flyout's main action.
 */
const InspectFlyoutIfNeeded = ({
  policies,
  inspectedPolicyName,
  setInspectedPolicyName,
  primaryAction,
}: {
  policies: IlmPolicyForFlyout[];
  inspectedPolicyName: string | null;
  setInspectedPolicyName: (name: string | null) => void;
  primaryAction: InspectIlmPolicyFlyoutPrimaryAction;
}) => {
  if (!inspectedPolicyName) return null;

  const inspectedPolicy = policies.find((p) => p.name === inspectedPolicyName);
  if (!inspectedPolicy?.serializedPolicy) return null;

  return (
    <InspectIlmPolicyFlyout
      policyName={inspectedPolicyName}
      policy={inspectedPolicy.serializedPolicy}
      onBack={() => setInspectedPolicyName(null)}
      onEditPolicy={action('onEditPolicy')}
      primaryAction={primaryAction}
      type="overlay"
    />
  );
};

// ---------------------------------------------------------------------------
// Serverless — DLM only, delete phase only (no Hot, no Frozen)
// ---------------------------------------------------------------------------

const ServerlessStory = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [inheritSuccessful, setInheritSuccessful] = useState(false);
  const [inheritFailed, setInheritFailed] = useState(false);
  const [failureStoreEnabled, setFailureStoreEnabled] = useState(true);

  if (!isOpen) {
    return <EuiButton onClick={() => setIsOpen(true)}>Open flyout</EuiButton>;
  }

  return (
    <EditDataLifecycleFlyout
      onClose={() => {
        action('onClose')();
        setIsOpen(false);
      }}
      onApply={(args: EditDataLifecycleFlyoutOnApplyArgs) => {
        action('onApply')(args);
        setIsOpen(false);
      }}
      isServerless
      successfulData={{
        inheritLifecycle: inheritSuccessful,
        onInheritLifecycleChange: setInheritSuccessful,
        indexTemplateHref: '#',
        dlm: DLM_PROPS,
      }}
      failedData={{
        inheritLifecycle: inheritFailed,
        onInheritLifecycleChange: setInheritFailed,
        indexTemplateHref: '#',
        failureStoreEnabled,
        onFailureStoreChange: setFailureStoreEnabled,
        deletePhaseDefaultValue: DEFAULT_DELETE_PHASE,
      }}
    />
  );
};

export const Serverless: StoryObj = {
  name: 'Serverless (delete phase only)',
  render: () => <ServerlessStory />,
};

// ---------------------------------------------------------------------------
// DLM + ILM method picker
// ---------------------------------------------------------------------------

const DlmAndIlmStory = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [inheritSuccessful, setInheritSuccessful] = useState(false);
  const [method, setMethod] = useState<'dlm' | 'ilm'>('dlm');
  const [selectedIlmPolicy, setSelectedIlmPolicy] = useState<string | undefined>(undefined);
  const [inspectedPolicyName, setInspectedPolicyName] = useState<string | null>(null);
  const [inheritFailed, setInheritFailed] = useState(false);
  const [failureStoreEnabled, setFailureStoreEnabled] = useState(true);

  const handleApply = (args: EditDataLifecycleFlyoutOnApplyArgs) => {
    action('onApply')(args);
    setInspectedPolicyName(null);
    setIsOpen(false);
  };

  if (!isOpen) {
    return <EuiButton onClick={() => setIsOpen(true)}>Open flyout</EuiButton>;
  }

  return (
    <>
      <EditDataLifecycleFlyout
        onClose={() => {
          action('onClose')();
          setIsOpen(false);
        }}
        onApply={handleApply}
        successfulData={{
          inheritLifecycle: inheritSuccessful,
          onInheritLifecycleChange: (next) => {
            setInheritSuccessful(next);
            if (!next) setMethod('dlm');
          },
          indexTemplateHref: '#',
          dlm: DLM_PROPS,
          ilm: {
            method,
            onMethodChange: setMethod,
            policies: POLICIES,
            selectedPolicyName: selectedIlmPolicy,
            onPolicySelect: setSelectedIlmPolicy,
            onPolicyInspect: setInspectedPolicyName,
          },
        }}
        failedData={{
          inheritLifecycle: inheritFailed,
          onInheritLifecycleChange: setInheritFailed,
          indexTemplateHref: '#',
          failureStoreEnabled,
          onFailureStoreChange: setFailureStoreEnabled,
          deletePhaseDefaultValue: DEFAULT_DELETE_PHASE,
        }}
      />
      <InspectFlyoutIfNeeded
        policies={POLICIES}
        inspectedPolicyName={inspectedPolicyName}
        setInspectedPolicyName={setInspectedPolicyName}
        primaryAction={{
          label: 'Apply',
          onClick: (policyName) => {
            setSelectedIlmPolicy(policyName);
            setMethod('ilm');
            handleApply({
              successfulData: buildDataLifecycleApplyPayload({
                inheritLifecycle: false,
                method: 'ilm',
                ilmPolicyName: policyName,
              }),
              failedData: buildFailedDataLifecycleApplyPayload({
                inheritLifecycle: inheritFailed,
                failureStoreEnabled,
              }),
            });
          },
        }}
      />
    </>
  );
};

export const DlmAndIlm: StoryObj = {
  name: 'DLM + ILM method picker',
  render: () => <DlmAndIlmStory />,
};

// ---------------------------------------------------------------------------
// ILM pre-selected
// ---------------------------------------------------------------------------

const IlmSelectedStory = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [inheritSuccessful, setInheritSuccessful] = useState(false);
  const [method, setMethod] = useState<'dlm' | 'ilm'>('ilm');
  const [selectedIlmPolicy, setSelectedIlmPolicy] = useState<string | undefined>(POLICIES[0].name);
  const [inspectedPolicyName, setInspectedPolicyName] = useState<string | null>(null);
  const [inheritFailed, setInheritFailed] = useState(false);
  const [failureStoreEnabled, setFailureStoreEnabled] = useState(false);

  const handleApply = (args: EditDataLifecycleFlyoutOnApplyArgs) => {
    action('onApply')(args);
    setInspectedPolicyName(null);
    setIsOpen(false);
  };

  if (!isOpen) {
    return <EuiButton onClick={() => setIsOpen(true)}>Open flyout</EuiButton>;
  }

  return (
    <>
      <EditDataLifecycleFlyout
        onClose={() => {
          action('onClose')();
          setIsOpen(false);
        }}
        onApply={handleApply}
        successfulData={{
          inheritLifecycle: inheritSuccessful,
          onInheritLifecycleChange: (next) => {
            setInheritSuccessful(next);
            if (!next) setMethod('ilm');
          },
          indexTemplateHref: '#',
          dlm: DLM_PROPS,
          ilm: {
            method,
            onMethodChange: setMethod,
            policies: POLICIES,
            selectedPolicyName: selectedIlmPolicy,
            onPolicySelect: setSelectedIlmPolicy,
            onPolicyInspect: setInspectedPolicyName,
          },
        }}
        failedData={{
          inheritLifecycle: inheritFailed,
          onInheritLifecycleChange: setInheritFailed,
          indexTemplateHref: '#',
          failureStoreEnabled,
          onFailureStoreChange: setFailureStoreEnabled,
          deletePhaseDefaultValue: DEFAULT_DELETE_PHASE,
        }}
      />
      <InspectFlyoutIfNeeded
        policies={POLICIES}
        inspectedPolicyName={inspectedPolicyName}
        setInspectedPolicyName={setInspectedPolicyName}
        primaryAction={{
          label: 'Apply',
          onClick: (policyName) => {
            setSelectedIlmPolicy(policyName);
            setMethod('ilm');
            handleApply({
              successfulData: buildDataLifecycleApplyPayload({
                inheritLifecycle: false,
                method: 'ilm',
                ilmPolicyName: policyName,
              }),
              failedData: buildFailedDataLifecycleApplyPayload({
                inheritLifecycle: inheritFailed,
                failureStoreEnabled,
              }),
            });
          },
        }}
      />
    </>
  );
};

export const IlmSelected: StoryObj = {
  name: 'ILM pre-selected',
  render: () => <IlmSelectedStory />,
};

// ---------------------------------------------------------------------------
// Inheriting from index template
// ---------------------------------------------------------------------------

const InheritingStory = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [inheritSuccessful, setInheritSuccessful] = useState(true);
  const [method, setMethod] = useState<'dlm' | 'ilm'>('dlm');
  const [selectedIlmPolicy, setSelectedIlmPolicy] = useState<string | undefined>(undefined);
  const [inspectedPolicyName, setInspectedPolicyName] = useState<string | null>(null);
  const [inheritFailed, setInheritFailed] = useState(true);
  const [failureStoreEnabled, setFailureStoreEnabled] = useState(true);

  const handleApply = (args: EditDataLifecycleFlyoutOnApplyArgs) => {
    action('onApply')(args);
    setInspectedPolicyName(null);
    setIsOpen(false);
  };

  if (!isOpen) {
    return <EuiButton onClick={() => setIsOpen(true)}>Open flyout</EuiButton>;
  }

  return (
    <>
      <EditDataLifecycleFlyout
        onClose={() => {
          action('onClose')();
          setIsOpen(false);
        }}
        onApply={handleApply}
        successfulData={{
          inheritLifecycle: inheritSuccessful,
          onInheritLifecycleChange: setInheritSuccessful,
          indexTemplateHref: '#',
          dlm: DLM_PROPS,
          ilm: {
            method,
            onMethodChange: setMethod,
            policies: POLICIES,
            selectedPolicyName: selectedIlmPolicy,
            onPolicySelect: setSelectedIlmPolicy,
            onPolicyInspect: setInspectedPolicyName,
          },
        }}
        failedData={{
          inheritLifecycle: inheritFailed,
          onInheritLifecycleChange: setInheritFailed,
          indexTemplateHref: '#',
          failureStoreEnabled,
          onFailureStoreChange: setFailureStoreEnabled,
          deletePhaseDefaultValue: DEFAULT_DELETE_PHASE,
        }}
      />
      <InspectFlyoutIfNeeded
        policies={POLICIES}
        inspectedPolicyName={inspectedPolicyName}
        setInspectedPolicyName={setInspectedPolicyName}
        primaryAction={{
          label: 'Apply',
          onClick: (policyName) => {
            setSelectedIlmPolicy(policyName);
            setInheritSuccessful(false);
            setMethod('ilm');
            handleApply({
              successfulData: buildDataLifecycleApplyPayload({
                inheritLifecycle: false,
                method: 'ilm',
                ilmPolicyName: policyName,
              }),
              failedData: buildFailedDataLifecycleApplyPayload({
                inheritLifecycle: inheritFailed,
                failureStoreEnabled,
              }),
            });
          },
          isDisabled: inheritSuccessful,
        }}
      />
    </>
  );
};

export const Inheriting: StoryObj = {
  name: 'Inheriting from index template',
  render: () => <InheritingStory />,
};

// ---------------------------------------------------------------------------
// DLM — Frozen + Delete with real data
// ---------------------------------------------------------------------------

const DlmFrozenAndDeleteStory = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [inheritSuccessful, setInheritSuccessful] = useState(false);
  const [inheritFailed, setInheritFailed] = useState(false);
  const [failureStoreEnabled, setFailureStoreEnabled] = useState(true);

  if (!isOpen) {
    return <EuiButton onClick={() => setIsOpen(true)}>Open flyout</EuiButton>;
  }

  return (
    <EditDataLifecycleFlyout
      onClose={() => {
        action('onClose')();
        setIsOpen(false);
      }}
      onApply={(args: EditDataLifecycleFlyoutOnApplyArgs) => {
        action('onApply')(args);
        setIsOpen(false);
      }}
      successfulData={{
        inheritLifecycle: inheritSuccessful,
        onInheritLifecycleChange: setInheritSuccessful,
        indexTemplateHref: '#',
        dlm: {
          ...DLM_PROPS,
          defaultValue: {
            frozen: { enabled: true, value: '30', unit: 'd' },
            delete: { enabled: true, value: '60', unit: 'd' },
          },
        },
      }}
      failedData={{
        inheritLifecycle: inheritFailed,
        onInheritLifecycleChange: setInheritFailed,
        indexTemplateHref: '#',
        failureStoreEnabled,
        onFailureStoreChange: setFailureStoreEnabled,
        deletePhaseDefaultValue: DEFAULT_DELETE_PHASE,
      }}
    />
  );
};

export const DlmFrozenAndDelete: StoryObj = {
  name: 'DLM — Frozen + Delete phases (with data)',
  render: () => <DlmFrozenAndDeleteStory />,
};

// ---------------------------------------------------------------------------
// DLM — Frozen + Delete inherited from index template
// ---------------------------------------------------------------------------

const DlmFrozenAndDeleteInheritedStory = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [inheritSuccessful, setInheritSuccessful] = useState(true);
  const [inheritFailed, setInheritFailed] = useState(true);
  const [failureStoreEnabled, setFailureStoreEnabled] = useState(true);

  if (!isOpen) {
    return <EuiButton onClick={() => setIsOpen(true)}>Open flyout</EuiButton>;
  }

  return (
    <EditDataLifecycleFlyout
      onClose={() => {
        action('onClose')();
        setIsOpen(false);
      }}
      onApply={(args: EditDataLifecycleFlyoutOnApplyArgs) => {
        action('onApply')(args);
        setIsOpen(false);
      }}
      successfulData={{
        inheritLifecycle: inheritSuccessful,
        onInheritLifecycleChange: setInheritSuccessful,
        indexTemplateHref: '#',
        dlm: {
          ...DLM_PROPS,
          defaultValue: {
            frozen: { enabled: true, value: '30', unit: 'd' },
            delete: { enabled: true, value: '60', unit: 'd' },
          },
        },
      }}
      failedData={{
        inheritLifecycle: inheritFailed,
        onInheritLifecycleChange: setInheritFailed,
        indexTemplateHref: '#',
        failureStoreEnabled,
        onFailureStoreChange: setFailureStoreEnabled,
        deletePhaseDefaultValue: DEFAULT_DELETE_PHASE,
      }}
    />
  );
};

export const DlmFrozenAndDeleteInherited: StoryObj = {
  name: 'DLM — Frozen + Delete phases (inherited)',
  render: () => <DlmFrozenAndDeleteInheritedStory />,
};

// ---------------------------------------------------------------------------
// DLM — Frozen requires Enterprise license
// ---------------------------------------------------------------------------

const DlmFrozenRequiresEnterpriseStory = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [inheritSuccessful, setInheritSuccessful] = useState(false);
  const [inheritFailed, setInheritFailed] = useState(false);
  const [failureStoreEnabled, setFailureStoreEnabled] = useState(true);

  if (!isOpen) {
    return <EuiButton onClick={() => setIsOpen(true)}>Open flyout</EuiButton>;
  }

  return (
    <EditDataLifecycleFlyout
      onClose={() => {
        action('onClose')();
        setIsOpen(false);
      }}
      onApply={(args: EditDataLifecycleFlyoutOnApplyArgs) => {
        action('onApply')(args);
        setIsOpen(false);
      }}
      successfulData={{
        inheritLifecycle: inheritSuccessful,
        onInheritLifecycleChange: setInheritSuccessful,
        indexTemplateHref: '#',
        dlm: {
          ...DLM_PROPS,
          hasEnterpriseLicense: false,
          enterprise: {
            isCloudEnabled: true,
            canManageLicense: true,
            trialDaysLeft: undefined,
            onUpgrade: action('enterprise.onUpgrade'),
            subscriptionFeaturesUrl: 'https://www.elastic.co/subscriptions/cloud',
          },
        },
      }}
      failedData={{
        inheritLifecycle: inheritFailed,
        onInheritLifecycleChange: setInheritFailed,
        indexTemplateHref: '#',
        failureStoreEnabled,
        onFailureStoreChange: setFailureStoreEnabled,
        deletePhaseDefaultValue: DEFAULT_DELETE_PHASE,
      }}
    />
  );
};

export const DlmFrozenRequiresEnterprise: StoryObj = {
  name: 'DLM — Frozen requires Enterprise license',
  render: () => <DlmFrozenRequiresEnterpriseStory />,
};

// ---------------------------------------------------------------------------
// DLM — Frozen requires default snapshot repository
// ---------------------------------------------------------------------------

const DlmFrozenRequiresSnapshotStory = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [hasDefaultSnapshotRepository, setHasDefaultSnapshotRepository] = useState(false);
  const [inheritSuccessful, setInheritSuccessful] = useState(false);
  const [inheritFailed, setInheritFailed] = useState(false);
  const [failureStoreEnabled, setFailureStoreEnabled] = useState(true);

  if (!isOpen) {
    return <EuiButton onClick={() => setIsOpen(true)}>Open flyout</EuiButton>;
  }

  return (
    <EditDataLifecycleFlyout
      onClose={() => {
        action('onClose')();
        setIsOpen(false);
      }}
      onApply={(args: EditDataLifecycleFlyoutOnApplyArgs) => {
        action('onApply')(args);
        setIsOpen(false);
      }}
      successfulData={{
        inheritLifecycle: inheritSuccessful,
        onInheritLifecycleChange: setInheritSuccessful,
        indexTemplateHref: '#',
        dlm: {
          ...DLM_PROPS,
          hasDefaultSnapshotRepository,
          onRefreshDefaultSnapshotRepository: async () => {
            action('onRefreshDefaultSnapshotRepository')();
            await new Promise((resolve) => setTimeout(resolve, 800));
            setHasDefaultSnapshotRepository(true);
          },
        },
      }}
      failedData={{
        inheritLifecycle: inheritFailed,
        onInheritLifecycleChange: setInheritFailed,
        indexTemplateHref: '#',
        failureStoreEnabled,
        onFailureStoreChange: setFailureStoreEnabled,
        deletePhaseDefaultValue: DEFAULT_DELETE_PHASE,
      }}
    />
  );
};

export const DlmFrozenRequiresSnapshot: StoryObj = {
  name: 'DLM — Frozen requires default snapshot repository',
  render: () => <DlmFrozenRequiresSnapshotStory />,
};

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta: Meta = {
  title: 'Edit Data Lifecycle Flyout',
  component: EditDataLifecycleFlyout,
};

export default meta;
