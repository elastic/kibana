/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlyout,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  type EuiFlyoutProps,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { SerializedPolicy } from '@kbn/index-lifecycle-management-common-shared';
import { EditDataLifecycleFlyoutBody } from '../edit_data_lifecycle_flyout_body';
import {
  FlyoutFooterWithRetentionWarning,
  useRetentionWarning,
} from '../../flyout_footer_with_retention_warning';
import {
  buildDataLifecycleApplyPayload,
  type DataLifecycleMethod,
  type IlmPolicyForFlyout,
} from '../types';
import { FlyoutWithTabs } from '../../flyout_with_tabs';
import {
  InspectIlmPolicyFlyout,
  type InspectIlmPolicyFlyoutPrimaryAction,
} from '../../inspect_ilm_policy_flyout';

// ---------------------------------------------------------------------------
// Shared fixture data
// ---------------------------------------------------------------------------

/**
 * A policy that includes downsampling steps — used to trigger the retention
 * warning in the Streams footer when `canUseDownsampling` is false.
 */
const DOWNSAMPLING_POLICY_NAME = '.alerts-ilm-policy';

const BASE_SERIALIZED_POLICIES: SerializedPolicy[] = [
  {
    name: DOWNSAMPLING_POLICY_NAME,
    phases: {
      hot: { min_age: '0ms', actions: { rollover: { max_age: '7d' } } },
      warm: { min_age: '7d', actions: { downsample: { fixed_interval: '1h' } } },
      cold: { min_age: '30d', actions: { downsample: { fixed_interval: '1d' } } },
      delete: { min_age: '60d', actions: { delete: {} } },
    },
  },
  {
    name: '.amet-illium-dolor',
    phases: {
      hot: { min_age: '0ms', actions: { rollover: { max_age: '7d' } } },
      warm: { min_age: '7d', actions: { downsample: { fixed_interval: '1d' } } },
      delete: { min_age: '60d', actions: { delete: {} } },
    },
  },
  {
    name: '.amet-ipsum-dolor',
    phases: {
      hot: { min_age: '0ms', actions: { rollover: { max_age: '30d' } } },
    },
  },
  {
    name: '.consectetur-adipiscing-elit-with-downsample-step-and-delete-phase-action-and-warm-phase-action',
    phases: {
      hot: { min_age: '0ms', actions: { rollover: { max_age: '7d' } } },
      warm: { min_age: '7d', actions: { downsample: { fixed_interval: '30m' } } },
      cold: { min_age: '30d', actions: { downsample: { fixed_interval: '1h' } } },
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
    name: '.ea-ipsum-duis',
    phases: {
      hot: { min_age: '0ms', actions: { rollover: { max_age: '7d' } } },
      warm: { min_age: '7d', actions: {} },
      delete: { min_age: '365d', actions: { delete: {} } },
    },
  },
  {
    name: '.est-sunt-culpa',
    phases: {
      hot: { min_age: '0ms', actions: { rollover: { max_age: '7d' } } },
      warm: { min_age: '7d', actions: { downsample: { fixed_interval: '1h' } } },
      cold: { min_age: '30d', actions: { downsample: { fixed_interval: '1d' } } },
      delete: { min_age: '60d', actions: { delete: {} } },
    },
  },
  {
    name: '.et-sed-nisi',
    phases: {
      hot: {
        min_age: '0ms',
        actions: { rollover: { max_age: '7d' }, downsample: { fixed_interval: '1h' } },
      },
      warm: { min_age: '7d', actions: {} },
      cold: { min_age: '30d', actions: {} },
    },
  },
  {
    name: '.short-rollover-long-retention',
    phases: {
      hot: { min_age: '0ms', actions: { rollover: { max_age: '1d' } } },
      warm: { min_age: '1d', actions: { downsample: { fixed_interval: '10m' } } },
      cold: { min_age: '30d', actions: { downsample: { fixed_interval: '1h' } } },
      delete: { min_age: '365d', actions: { delete: {} } },
    },
  },
];

const hasDownsamplingAction = (policy: SerializedPolicy): boolean => {
  return Object.values(policy.phases ?? {}).some((phase) => {
    const actions = phase?.actions as Record<string, unknown> | undefined;
    return Boolean(actions && 'downsample' in actions);
  });
};

const POLICIES: IlmPolicyForFlyout[] = BASE_SERIALIZED_POLICIES.map((p) => ({
  name: p.name,
  phases: p.phases,
  serializedPolicy: p,
}));

const NON_DOWNSAMPLING_POLICY_NAME =
  POLICIES.find((p) => p.serializedPolicy && !hasDownsamplingAction(p.serializedPolicy))?.name ??
  POLICIES[0].name;

const LAST_POLICY_NAME = POLICIES[POLICIES.length - 1].name;

const DataStreamLifecycleRetentionInput = ({ disabled }: { disabled: boolean }) => {
  const id = useGeneratedHtmlId({ prefix: 'dlmRetention' });
  return (
    <EuiFieldText id={id} fullWidth disabled={disabled} defaultValue="30d" placeholder="e.g. 30d" />
  );
};

// ---------------------------------------------------------------------------
// Shell components matching each consumer's structure
// ---------------------------------------------------------------------------

/**
 * Index Management wraps the body in a tabbed flyout (overlay mode).
 */
const IndexManagementFlyoutShell = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <FlyoutWithTabs
    title={title}
    tabsAriaLabel="Data lifecycle tabs"
    tabs={[{ id: 'successful_data', label: 'Successful data' }]}
    initialTabId="successful_data"
    onClose={action('onClose')}
    size={400}
    type="overlay"
  >
    {() => children}
  </FlyoutWithTabs>
);

/**
 * Streams uses a plain push flyout without tabs.
 */
const StreamsFlyoutShell = ({ title, children }: { title: string; children: React.ReactNode }) => {
  const titleId = useGeneratedHtmlId({ prefix: 'streamsFlyoutTitle' });
  const { euiTheme } = useEuiTheme();
  const headerContentStyles = css`
    padding: ${euiTheme.size.l};
  `;

  return (
    <EuiFlyout
      onClose={action('onClose')}
      size={400}
      ownFocus
      paddingSize="none"
      aria-labelledby={titleId}
      type="push"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup
          direction="column"
          gutterSize="s"
          responsive={false}
          css={headerContentStyles}
        >
          <EuiFlexItem grow={false}>
            <EuiTitle size="s">
              <h2 id={titleId}>{title}</h2>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      {children}
    </EuiFlyout>
  );
};

/** Plain footer used by Index Management. */
const PlainFlyoutFooter = ({
  onCancel,
  onApply,
  isApplyDisabled,
}: {
  onCancel: () => void;
  onApply: () => void;
  isApplyDisabled?: boolean;
}) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlyoutFooter>
      <EuiFlexGroup
        justifyContent="spaceBetween"
        alignItems="center"
        gutterSize="s"
        responsive={false}
        css={css`
          padding: ${euiTheme.size.m} ${euiTheme.size.l};
        `}
      >
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={onCancel} flush="left" size="s">
            Cancel
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton fill onClick={onApply} disabled={isApplyDisabled} size="s">
            Apply
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );
};

// ---------------------------------------------------------------------------
// Shared inspect-policy handler used by multiple stories
// ---------------------------------------------------------------------------

interface WithInspectProps {
  policies: IlmPolicyForFlyout[];
  inspectedPolicyName: string | null;
  setInspectedPolicyName: (name: string | null) => void;
  primaryAction: InspectIlmPolicyFlyoutPrimaryAction;
  type: EuiFlyoutProps['type'];
}

const InspectFlyoutIfNeeded = ({
  policies,
  inspectedPolicyName,
  setInspectedPolicyName,
  primaryAction,
  type,
}: WithInspectProps) => {
  const inspectedPolicy = inspectedPolicyName
    ? policies.find((p) => p.name === inspectedPolicyName)
    : undefined;

  if (!inspectedPolicyName || !inspectedPolicy?.serializedPolicy) return null;

  return (
    <InspectIlmPolicyFlyout
      policyName={inspectedPolicyName}
      policy={inspectedPolicy.serializedPolicy}
      onBack={() => setInspectedPolicyName(null)}
      onEditPolicy={action('onEditIlmPolicy')}
      primaryAction={primaryAction}
      type={type}
    />
  );
};

// ===========================================================================
// INDEX MANAGEMENT STORIES
// ===========================================================================

/**
 * Index Management — ILM selected
 *
 * The data stream already uses an ILM policy. The user sees the ILM method
 * pre-selected and can switch policies or change to DLM.
 */
const IndexManagementIlmSelectedStory = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [inheritLifecycle, setInheritLifecycle] = useState(false);
  const [method, setMethod] = useState<DataLifecycleMethod>('ilm');
  const [selectedPolicyName, setSelectedPolicyName] = useState<string>(
    POLICIES[POLICIES.length - 1].name
  );
  const [inspectedPolicyName, setInspectedPolicyName] = useState<string | null>(null);

  const onCancel = () => {
    action('onCancel')();
    setInspectedPolicyName(null);
    setIsOpen(false);
  };

  const onApply = (overrides?: {
    inheritLifecycle?: boolean;
    method?: DataLifecycleMethod;
    ilmPolicyName?: string;
  }) => {
    const effectiveInheritLifecycle = overrides?.inheritLifecycle ?? inheritLifecycle;
    const effectiveMethod = overrides?.method ?? method;
    const effectiveIlmPolicyName = overrides?.ilmPolicyName ?? selectedPolicyName;

    const payload = buildDataLifecycleApplyPayload({
      inheritLifecycle: effectiveInheritLifecycle,
      method: effectiveMethod,
      ilmPolicyName: effectiveIlmPolicyName,
    });
    if (payload) action('onApply')(payload);
    setInspectedPolicyName(null);
    setIsOpen(false);
  };

  const inspectFlyout = (
    <InspectFlyoutIfNeeded
      policies={POLICIES}
      inspectedPolicyName={inspectedPolicyName}
      setInspectedPolicyName={setInspectedPolicyName}
      primaryAction={{
        label: 'Apply',
        onClick: (policyName) => {
          setSelectedPolicyName(policyName);
          setMethod('ilm');
          onApply({ method: 'ilm', ilmPolicyName: policyName });
        },
        isDisabled: inheritLifecycle ? false : method === 'ilm' ? !selectedPolicyName : false,
        'data-test-subj': 'inspectIlmPolicyFlyoutApplyButton',
      }}
      type="overlay"
    />
  );

  const isApplyDisabled = inheritLifecycle ? false : method === 'ilm' ? !selectedPolicyName : false;

  if (!isOpen) {
    return <EuiButton onClick={() => setIsOpen(true)}>Open flyout</EuiButton>;
  }

  return (
    <>
      <IndexManagementFlyoutShell title="Edit data lifecycle">
        <EditDataLifecycleFlyoutBody
          inherit={{
            value: inheritLifecycle,
            onChange: (next) => {
              setInheritLifecycle(next);
              if (!next) setMethod('ilm');
            },
            label: 'Inherit lifecycle from index template',
            link: {
              href: '#',
              label: 'View index template',
            },
          }}
          method={{ value: method, onChange: setMethod }}
          ilm={{
            policies: POLICIES,
            selectedPolicyName,
            onSelect: setSelectedPolicyName,
            onInspect: setInspectedPolicyName,
          }}
        />
        <PlainFlyoutFooter
          onCancel={onCancel}
          onApply={onApply}
          isApplyDisabled={isApplyDisabled}
        />
      </IndexManagementFlyoutShell>
      {inspectFlyout}
    </>
  );
};

export const IndexManagementIlmSelected: StoryObj = {
  name: 'Index Management — ILM selected',
  render: () => <IndexManagementIlmSelectedStory />,
};

/**
 * Index Management — DLM selected
 *
 * The data stream uses Data Lifecycle Management (DLM). The DLM radio is
 * pre-selected; Index Management renders its retention form in the body.
 */
const IndexManagementDlmSelectedStory = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [inheritLifecycle, setInheritLifecycle] = useState(false);
  const [method, setMethod] = useState<DataLifecycleMethod>('dlm');
  const [selectedPolicyName, setSelectedPolicyName] = useState<string | undefined>(undefined);
  const [inspectedPolicyName, setInspectedPolicyName] = useState<string | null>(null);

  const onCancel = () => {
    action('onCancel')();
    setInspectedPolicyName(null);
    setIsOpen(false);
  };

  const onApply = (overrides?: {
    inheritLifecycle?: boolean;
    method?: DataLifecycleMethod;
    ilmPolicyName?: string;
  }) => {
    const effectiveInheritLifecycle = overrides?.inheritLifecycle ?? inheritLifecycle;
    const effectiveMethod = overrides?.method ?? method;
    const effectiveIlmPolicyName = overrides?.ilmPolicyName ?? selectedPolicyName;

    const payload = buildDataLifecycleApplyPayload({
      inheritLifecycle: effectiveInheritLifecycle,
      method: effectiveMethod,
      ilmPolicyName: effectiveIlmPolicyName,
    });
    if (payload) action('onApply')(payload);
    setInspectedPolicyName(null);
    setIsOpen(false);
  };

  const inspectFlyout = (
    <InspectFlyoutIfNeeded
      policies={POLICIES}
      inspectedPolicyName={inspectedPolicyName}
      setInspectedPolicyName={setInspectedPolicyName}
      primaryAction={{
        label: 'Apply',
        onClick: (policyName) => {
          setSelectedPolicyName(policyName);
          setMethod('ilm');
          onApply({ method: 'ilm', ilmPolicyName: policyName });
        },
        'data-test-subj': 'inspectIlmPolicyFlyoutApplyButton',
      }}
      type="overlay"
    />
  );

  if (!isOpen) {
    return <EuiButton onClick={() => setIsOpen(true)}>Open flyout</EuiButton>;
  }

  return (
    <>
      <IndexManagementFlyoutShell title="Edit data lifecycle">
        <EditDataLifecycleFlyoutBody
          inherit={{
            value: inheritLifecycle,
            onChange: (next) => {
              setInheritLifecycle(next);
              if (!next) setMethod('dlm');
            },
            label: 'Inherit lifecycle from index template',
            link: {
              href: '#',
              label: 'View index template',
            },
          }}
          method={{ value: method, onChange: setMethod }}
          ilm={{
            policies: POLICIES,
            selectedPolicyName,
            onSelect: (name) => {
              setSelectedPolicyName(name);
            },
            onInspect: setInspectedPolicyName,
          }}
          dataStreamLifecycleContent={
            <DataStreamLifecycleRetentionInput disabled={inheritLifecycle} />
          }
        />
        <PlainFlyoutFooter onCancel={onCancel} onApply={onApply} />
      </IndexManagementFlyoutShell>
      {inspectFlyout}
    </>
  );
};

export const IndexManagementDlmSelected: StoryObj = {
  name: 'Index Management — DLM selected',
  render: () => <IndexManagementDlmSelectedStory />,
};

/**
 * Index Management — inheriting ILM from index template
 *
 * The data stream's retention is controlled by its index template (which in
 * turn references an ILM policy). The inherit checkbox is ticked; the ILM
 * policy list shows only the inherited policy in a read-only panel.
 */
const IndexManagementInheritingIlmStory = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [inheritLifecycle, setInheritLifecycle] = useState(true);
  const [method, setMethod] = useState<DataLifecycleMethod>('ilm');
  const [selectedPolicyName, setSelectedPolicyName] = useState<string>(
    NON_DOWNSAMPLING_POLICY_NAME
  );
  const [inspectedPolicyName, setInspectedPolicyName] = useState<string | null>(null);

  const isApplyDisabled = inheritLifecycle;

  const onCancel = () => {
    action('onCancel')();
    setInspectedPolicyName(null);
    setIsOpen(false);
  };

  const onApply = (overrides?: {
    inheritLifecycle?: boolean;
    method?: DataLifecycleMethod;
    ilmPolicyName?: string;
  }) => {
    const effectiveInheritLifecycle = overrides?.inheritLifecycle ?? inheritLifecycle;
    const effectiveMethod = overrides?.method ?? method;
    const effectiveIlmPolicyName = overrides?.ilmPolicyName ?? selectedPolicyName;

    const payload = buildDataLifecycleApplyPayload({
      inheritLifecycle: effectiveInheritLifecycle,
      method: effectiveMethod,
      ilmPolicyName: effectiveIlmPolicyName,
    });
    if (payload) action('onApply')(payload);
    setInspectedPolicyName(null);
    setIsOpen(false);
  };

  const inspectFlyout = (
    <InspectFlyoutIfNeeded
      policies={POLICIES}
      inspectedPolicyName={inspectedPolicyName}
      setInspectedPolicyName={setInspectedPolicyName}
      primaryAction={{
        label: 'Apply',
        onClick: (policyName) => {
          setSelectedPolicyName(policyName);
          setInheritLifecycle(false);
          onApply({ inheritLifecycle: false, ilmPolicyName: policyName });
        },
        isDisabled: isApplyDisabled,
        'data-test-subj': 'inspectIlmPolicyFlyoutApplyButton',
      }}
      type="overlay"
    />
  );

  if (!isOpen) {
    return <EuiButton onClick={() => setIsOpen(true)}>Open flyout</EuiButton>;
  }

  return (
    <>
      <IndexManagementFlyoutShell title="Edit data lifecycle">
        <EditDataLifecycleFlyoutBody
          inherit={{
            value: inheritLifecycle,
            onChange: (next) => {
              setInheritLifecycle(next);
              if (!next) setMethod('ilm');
            },
            label: 'Inherit lifecycle from index template',
            link: {
              href: '#',
              label: 'View index template',
            },
          }}
          method={{ value: method, onChange: setMethod }}
          ilm={{
            policies: POLICIES,
            selectedPolicyName,
            onSelect: setSelectedPolicyName,
            onInspect: setInspectedPolicyName,
          }}
        />
        <PlainFlyoutFooter
          onCancel={onCancel}
          onApply={onApply}
          isApplyDisabled={isApplyDisabled}
        />
      </IndexManagementFlyoutShell>
      {inspectFlyout}
    </>
  );
};

export const IndexManagementInheritingIlm: StoryObj = {
  name: 'Index Management — inheriting ILM from index template',
  render: () => <IndexManagementInheritingIlmStory />,
};

/**
 * Index Management — inheriting DLM from index template
 *
 * The index template specifies Data Stream Lifecycle. The inherit checkbox is
 * ticked and the DLM method is active; the retention form is shown greyed out.
 */
const IndexManagementInheritingDlmStory = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [inheritLifecycle, setInheritLifecycle] = useState(true);
  const [method, setMethod] = useState<DataLifecycleMethod>('dlm');
  const [selectedPolicyName, setSelectedPolicyName] = useState<string | undefined>(undefined);
  const [inspectedPolicyName, setInspectedPolicyName] = useState<string | null>(null);

  const isApplyDisabled = inheritLifecycle;

  const onCancel = () => {
    action('onCancel')();
    setInspectedPolicyName(null);
    setIsOpen(false);
  };

  const onApply = (overrides?: {
    inheritLifecycle?: boolean;
    method?: DataLifecycleMethod;
    ilmPolicyName?: string;
  }) => {
    const effectiveInheritLifecycle = overrides?.inheritLifecycle ?? inheritLifecycle;
    const effectiveMethod = overrides?.method ?? method;
    const effectiveIlmPolicyName = overrides?.ilmPolicyName ?? selectedPolicyName;

    const payload = buildDataLifecycleApplyPayload({
      inheritLifecycle: effectiveInheritLifecycle,
      method: effectiveMethod,
      ilmPolicyName: effectiveIlmPolicyName,
    });
    if (payload) action('onApply')(payload);
    setInspectedPolicyName(null);
    setIsOpen(false);
  };

  const inspectFlyout = (
    <InspectFlyoutIfNeeded
      policies={POLICIES}
      inspectedPolicyName={inspectedPolicyName}
      setInspectedPolicyName={setInspectedPolicyName}
      primaryAction={{
        label: 'Apply',
        onClick: (policyName) => {
          setSelectedPolicyName(policyName);
          setMethod('ilm');
          setInheritLifecycle(false);
          onApply({ inheritLifecycle: false, method: 'ilm', ilmPolicyName: policyName });
        },
        isDisabled: isApplyDisabled,
        'data-test-subj': 'inspectIlmPolicyFlyoutApplyButton',
      }}
      type="overlay"
    />
  );

  if (!isOpen) {
    return <EuiButton onClick={() => setIsOpen(true)}>Open flyout</EuiButton>;
  }

  return (
    <>
      <IndexManagementFlyoutShell title="Edit data lifecycle">
        <EditDataLifecycleFlyoutBody
          inherit={{
            value: inheritLifecycle,
            onChange: (next) => {
              setInheritLifecycle(next);
            },
            label: 'Inherit lifecycle from index template',
            link: {
              href: '#',
              label: 'View index template',
            },
          }}
          method={{ value: method, onChange: setMethod }}
          ilm={{
            policies: POLICIES,
            selectedPolicyName,
            onSelect: setSelectedPolicyName,
            onInspect: setInspectedPolicyName,
          }}
          dataStreamLifecycleContent={
            <DataStreamLifecycleRetentionInput disabled={inheritLifecycle} />
          }
        />
        <PlainFlyoutFooter
          onCancel={onCancel}
          onApply={onApply}
          isApplyDisabled={isApplyDisabled}
        />
      </IndexManagementFlyoutShell>
      {inspectFlyout}
    </>
  );
};

export const IndexManagementInheritingDlm: StoryObj = {
  name: 'Index Management — inheriting DLM from index template',
  render: () => <IndexManagementInheritingDlmStory />,
};

// ===========================================================================
// STREAMS STORIES
// ===========================================================================

/**
 * Streams — classic stream, ILM selected
 *
 * Classic (non-wired) streams can reference ILM policies. This is the initial
 * state after opening the flyout when an ILM policy is already applied.
 * Streams uses `FlyoutFooterWithRetentionWarning` instead of a plain footer.
 */
const StreamsClassicIlmSelectedStory = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [inheritLifecycle, setInheritLifecycle] = useState(false);
  const [method, setMethod] = useState<DataLifecycleMethod>('ilm');
  const [selectedPolicyName, setSelectedPolicyName] = useState<string>(
    NON_DOWNSAMPLING_POLICY_NAME
  );
  const [inspectedPolicyName, setInspectedPolicyName] = useState<string | null>(null);

  const onCancel = () => {
    action('onCancel')();
    setInspectedPolicyName(null);
    setIsOpen(false);
  };

  const onApply = (overrides?: {
    inheritLifecycle?: boolean;
    method?: DataLifecycleMethod;
    ilmPolicyName?: string;
  }) => {
    const effectiveInheritLifecycle = overrides?.inheritLifecycle ?? inheritLifecycle;
    const effectiveMethod = overrides?.method ?? method;
    const effectiveIlmPolicyName = overrides?.ilmPolicyName ?? selectedPolicyName;

    const payload = buildDataLifecycleApplyPayload({
      inheritLifecycle: effectiveInheritLifecycle,
      method: effectiveMethod,
      ilmPolicyName: effectiveIlmPolicyName,
    });
    if (payload) action('onApply')(payload);
    setInspectedPolicyName(null);
    setIsOpen(false);
  };

  const retentionWarning = useRetentionWarning({
    ilmPolicies: POLICIES,
    selectedIlmPolicyName: method === 'ilm' ? selectedPolicyName : undefined,
    canUseDownsampling: false,
    inheritLifecycle,
  });

  const inspectFlyout = (
    <InspectFlyoutIfNeeded
      policies={POLICIES}
      inspectedPolicyName={inspectedPolicyName}
      setInspectedPolicyName={setInspectedPolicyName}
      primaryAction={{
        label: 'Apply',
        onClick: (policyName) => {
          setSelectedPolicyName(policyName);
          setMethod('ilm');
          onApply({ method: 'ilm', ilmPolicyName: policyName });
        },
        'data-test-subj': 'inspectIlmPolicyFlyoutApplyButton',
      }}
      type="push"
    />
  );

  if (!isOpen) {
    return <EuiButton onClick={() => setIsOpen(true)}>Open flyout</EuiButton>;
  }

  return (
    <>
      <StreamsFlyoutShell title="Edit successful data lifecycle">
        <EditDataLifecycleFlyoutBody
          inherit={{
            value: inheritLifecycle,
            onChange: (next) => {
              setInheritLifecycle(next);
              if (!next) setMethod('ilm');
            },
            label: 'Inherit lifecycle from index template',
            link: {
              href: '#',
              label: 'Go to index template',
            },
          }}
          method={{ value: method, onChange: setMethod }}
          ilm={{
            policies: POLICIES,
            selectedPolicyName,
            onSelect: setSelectedPolicyName,
            onInspect: setInspectedPolicyName,
          }}
        />
        <FlyoutFooterWithRetentionWarning
          onCancel={onCancel}
          onApply={onApply}
          showWarning={retentionWarning}
        />
      </StreamsFlyoutShell>
      {inspectFlyout}
    </>
  );
};

export const StreamsClassicIlmSelected: StoryObj = {
  name: 'Streams — classic stream, ILM selected',
  render: () => <StreamsClassicIlmSelectedStory />,
};

/**
 * Streams — classic stream, ILM selected (pinned policy at top)
 *
 * This showcases the "incoming" (initially-applied) ILM policy being pinned at the top of the
 * scrollable list even when that policy would normally appear at the end.
 */
const StreamsClassicIlmSelectedPinnedStory = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [inheritLifecycle, setInheritLifecycle] = useState(false);
  const [method, setMethod] = useState<DataLifecycleMethod>('ilm');
  const [selectedPolicyName, setSelectedPolicyName] = useState<string>(LAST_POLICY_NAME);
  const [inspectedPolicyName, setInspectedPolicyName] = useState<string | null>(null);

  const onCancel = () => {
    action('onCancel')();
    setInspectedPolicyName(null);
    setIsOpen(false);
  };

  const onApply = (overrides?: {
    inheritLifecycle?: boolean;
    method?: DataLifecycleMethod;
    ilmPolicyName?: string;
  }) => {
    const effectiveInheritLifecycle = overrides?.inheritLifecycle ?? inheritLifecycle;
    const effectiveMethod = overrides?.method ?? method;
    const effectiveIlmPolicyName = overrides?.ilmPolicyName ?? selectedPolicyName;

    const payload = buildDataLifecycleApplyPayload({
      inheritLifecycle: effectiveInheritLifecycle,
      method: effectiveMethod,
      ilmPolicyName: effectiveIlmPolicyName,
    });
    if (payload) action('onApply')(payload);
    setInspectedPolicyName(null);
    setIsOpen(false);
  };

  const retentionWarning = useRetentionWarning({
    ilmPolicies: POLICIES,
    selectedIlmPolicyName: method === 'ilm' ? selectedPolicyName : undefined,
    canUseDownsampling: false,
    inheritLifecycle,
  });

  const inspectFlyout = (
    <InspectFlyoutIfNeeded
      policies={POLICIES}
      inspectedPolicyName={inspectedPolicyName}
      setInspectedPolicyName={setInspectedPolicyName}
      primaryAction={{
        label: 'Apply',
        onClick: (policyName) => {
          setSelectedPolicyName(policyName);
          setMethod('ilm');
          onApply({ method: 'ilm', ilmPolicyName: policyName });
        },
        'data-test-subj': 'inspectIlmPolicyFlyoutApplyButton',
      }}
      type="push"
    />
  );

  if (!isOpen) {
    return <EuiButton onClick={() => setIsOpen(true)}>Open flyout</EuiButton>;
  }

  return (
    <>
      <StreamsFlyoutShell title="Edit successful data lifecycle">
        <EditDataLifecycleFlyoutBody
          inherit={{
            value: inheritLifecycle,
            onChange: (next) => {
              setInheritLifecycle(next);
              if (!next) setMethod('ilm');
            },
            label: 'Inherit lifecycle from index template',
            link: {
              href: '#',
              label: 'Go to index template',
            },
          }}
          method={{ value: method, onChange: setMethod }}
          ilm={{
            policies: POLICIES,
            selectedPolicyName,
            onSelect: setSelectedPolicyName,
            onInspect: setInspectedPolicyName,
          }}
        />
        <FlyoutFooterWithRetentionWarning
          onCancel={onCancel}
          onApply={onApply}
          showWarning={retentionWarning}
        />
      </StreamsFlyoutShell>
      {inspectFlyout}
    </>
  );
};

export const StreamsClassicIlmSelectedPinned: StoryObj = {
  name: 'Streams — classic stream, ILM selected (pinned policy at top)',
  render: () => <StreamsClassicIlmSelectedPinnedStory />,
};

/**
 * Streams — classic stream, DLM selected
 *
 * Streams always saves DLM as infinite retention; no form is rendered for the
 * retention value. The DLM card is selected and the footer shows no warning.
 */
const StreamsClassicDlmSelectedStory = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [inheritLifecycle, setInheritLifecycle] = useState(false);
  const [method, setMethod] = useState<DataLifecycleMethod>('dlm');
  const [selectedPolicyName, setSelectedPolicyName] = useState<string | undefined>(undefined);
  const [inspectedPolicyName, setInspectedPolicyName] = useState<string | null>(null);

  const onCancel = () => {
    action('onCancel')();
    setInspectedPolicyName(null);
    setIsOpen(false);
  };

  const onApply = (overrides?: {
    inheritLifecycle?: boolean;
    method?: DataLifecycleMethod;
    ilmPolicyName?: string;
  }) => {
    const effectiveInheritLifecycle = overrides?.inheritLifecycle ?? inheritLifecycle;
    const effectiveMethod = overrides?.method ?? method;
    const effectiveIlmPolicyName = overrides?.ilmPolicyName ?? selectedPolicyName;

    const payload = buildDataLifecycleApplyPayload({
      inheritLifecycle: effectiveInheritLifecycle,
      method: effectiveMethod,
      ilmPolicyName: effectiveIlmPolicyName,
    });
    if (payload) action('onApply')(payload);
    setInspectedPolicyName(null);
    setIsOpen(false);
  };

  const retentionWarning = useRetentionWarning({
    ilmPolicies: POLICIES,
    selectedIlmPolicyName: method === 'ilm' ? selectedPolicyName : undefined,
    canUseDownsampling: false,
    inheritLifecycle,
  });

  const inspectFlyout = (
    <InspectFlyoutIfNeeded
      policies={POLICIES}
      inspectedPolicyName={inspectedPolicyName}
      setInspectedPolicyName={setInspectedPolicyName}
      primaryAction={{
        label: 'Apply',
        onClick: (policyName) => {
          setSelectedPolicyName(policyName);
          setMethod('ilm');
          onApply({ method: 'ilm', ilmPolicyName: policyName });
        },
        'data-test-subj': 'inspectIlmPolicyFlyoutApplyButton',
      }}
      type="push"
    />
  );

  if (!isOpen) {
    return <EuiButton onClick={() => setIsOpen(true)}>Open flyout</EuiButton>;
  }

  return (
    <>
      <StreamsFlyoutShell title="Edit successful data lifecycle">
        <EditDataLifecycleFlyoutBody
          inherit={{
            value: inheritLifecycle,
            onChange: setInheritLifecycle,
            label: 'Inherit lifecycle from index template',
            link: {
              href: '#',
              label: 'Go to index template',
            },
          }}
          method={{ value: method, onChange: setMethod }}
          ilm={{
            policies: POLICIES,
            selectedPolicyName,
            onSelect: setSelectedPolicyName,
            onInspect: setInspectedPolicyName,
          }}
        />
        <FlyoutFooterWithRetentionWarning
          onCancel={onCancel}
          onApply={onApply}
          showWarning={retentionWarning}
        />
      </StreamsFlyoutShell>
      {inspectFlyout}
    </>
  );
};

export const StreamsClassicDlmSelected: StoryObj = {
  name: 'Streams — classic stream, DLM selected',
  render: () => <StreamsClassicDlmSelectedStory />,
};

/**
 * Streams — classic stream, inheriting ILM from index template
 *
 * The inherit checkbox is ON and the effective lifecycle comes from an ILM
 * policy set in the index template. The policy is shown read-only in the list.
 */
const StreamsClassicInheritingIlmStory = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [inheritLifecycle, setInheritLifecycle] = useState(true);
  const [method, setMethod] = useState<DataLifecycleMethod>('ilm');
  const [selectedPolicyName, setSelectedPolicyName] = useState<string>(
    NON_DOWNSAMPLING_POLICY_NAME
  );
  const [inspectedPolicyName, setInspectedPolicyName] = useState<string | null>(null);

  const onCancel = () => {
    action('onCancel')();
    setInspectedPolicyName(null);
    setIsOpen(false);
  };

  const onApply = (overrides?: {
    inheritLifecycle?: boolean;
    method?: DataLifecycleMethod;
    ilmPolicyName?: string;
  }) => {
    const effectiveInheritLifecycle = overrides?.inheritLifecycle ?? inheritLifecycle;
    const effectiveMethod = overrides?.method ?? method;
    const effectiveIlmPolicyName = overrides?.ilmPolicyName ?? selectedPolicyName;

    const payload = buildDataLifecycleApplyPayload({
      inheritLifecycle: effectiveInheritLifecycle,
      method: effectiveMethod,
      ilmPolicyName: effectiveIlmPolicyName,
    });
    if (payload) action('onApply')(payload);
    setInspectedPolicyName(null);
    setIsOpen(false);
  };

  const retentionWarning = useRetentionWarning({
    ilmPolicies: POLICIES,
    selectedIlmPolicyName: method === 'ilm' ? selectedPolicyName : undefined,
    canUseDownsampling: false,
    inheritLifecycle,
  });

  const inspectFlyout = (
    <InspectFlyoutIfNeeded
      policies={POLICIES}
      inspectedPolicyName={inspectedPolicyName}
      setInspectedPolicyName={setInspectedPolicyName}
      primaryAction={{
        label: 'Apply',
        onClick: (policyName) => {
          setSelectedPolicyName(policyName);
          setInheritLifecycle(false);
          setMethod('ilm');
          onApply({ inheritLifecycle: false, method: 'ilm', ilmPolicyName: policyName });
        },
        isDisabled: inheritLifecycle,
        'data-test-subj': 'inspectIlmPolicyFlyoutApplyButton',
      }}
      type="push"
    />
  );

  if (!isOpen) {
    return <EuiButton onClick={() => setIsOpen(true)}>Open flyout</EuiButton>;
  }

  return (
    <>
      <StreamsFlyoutShell title="Edit successful data lifecycle">
        <EditDataLifecycleFlyoutBody
          inherit={{
            value: inheritLifecycle,
            onChange: (next) => {
              setInheritLifecycle(next);
              if (!next) setMethod('ilm');
            },
            label: 'Inherit lifecycle from index template',
            link: {
              href: '#',
              label: 'Go to index template',
            },
          }}
          method={{ value: method, onChange: setMethod }}
          ilm={{
            policies: POLICIES,
            selectedPolicyName,
            onSelect: setSelectedPolicyName,
            onInspect: setInspectedPolicyName,
          }}
        />
        <FlyoutFooterWithRetentionWarning
          onCancel={onCancel}
          onApply={onApply}
          isApplyDisabled={inheritLifecycle}
          showWarning={retentionWarning}
        />
      </StreamsFlyoutShell>
      {inspectFlyout}
    </>
  );
};

export const StreamsClassicInheritingIlm: StoryObj = {
  name: 'Streams — classic stream, inheriting ILM from index template',
  render: () => <StreamsClassicInheritingIlmStory />,
};

/**
 * Streams — classic stream, inheriting DLM from index template
 *
 * The inherit checkbox is ON and the effective lifecycle is DLM coming from
 * the index template. The DLM method is shown disabled.
 */
const StreamsClassicInheritingDlmStory = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [inheritLifecycle, setInheritLifecycle] = useState(true);
  const [method, setMethod] = useState<DataLifecycleMethod>('dlm');
  const [selectedPolicyName, setSelectedPolicyName] = useState<string | undefined>(undefined);
  const [inspectedPolicyName, setInspectedPolicyName] = useState<string | null>(null);

  const onCancel = () => {
    action('onCancel')();
    setInspectedPolicyName(null);
    setIsOpen(false);
  };

  const onApply = (overrides?: {
    inheritLifecycle?: boolean;
    method?: DataLifecycleMethod;
    ilmPolicyName?: string;
  }) => {
    const effectiveInheritLifecycle = overrides?.inheritLifecycle ?? inheritLifecycle;
    const effectiveMethod = overrides?.method ?? method;
    const effectiveIlmPolicyName = overrides?.ilmPolicyName ?? selectedPolicyName;

    const payload = buildDataLifecycleApplyPayload({
      inheritLifecycle: effectiveInheritLifecycle,
      method: effectiveMethod,
      ilmPolicyName: effectiveIlmPolicyName,
    });
    if (payload) action('onApply')(payload);
    setInspectedPolicyName(null);
    setIsOpen(false);
  };

  const retentionWarning = useRetentionWarning({
    ilmPolicies: POLICIES,
    selectedIlmPolicyName: method === 'ilm' ? selectedPolicyName : undefined,
    canUseDownsampling: false,
    inheritLifecycle,
  });

  const inspectFlyout = (
    <InspectFlyoutIfNeeded
      policies={POLICIES}
      inspectedPolicyName={inspectedPolicyName}
      setInspectedPolicyName={setInspectedPolicyName}
      primaryAction={{
        label: 'Apply',
        onClick: (policyName) => {
          setSelectedPolicyName(policyName);
          setMethod('ilm');
          setInheritLifecycle(false);
          onApply({ inheritLifecycle: false, method: 'ilm', ilmPolicyName: policyName });
        },
        isDisabled: inheritLifecycle,
        'data-test-subj': 'inspectIlmPolicyFlyoutApplyButton',
      }}
      type="push"
    />
  );

  if (!isOpen) {
    return <EuiButton onClick={() => setIsOpen(true)}>Open flyout</EuiButton>;
  }

  return (
    <>
      <StreamsFlyoutShell title="Edit successful data lifecycle">
        <EditDataLifecycleFlyoutBody
          inherit={{
            value: inheritLifecycle,
            onChange: setInheritLifecycle,
            label: 'Inherit lifecycle from index template',
            link: {
              href: '#',
              label: 'Go to index template',
            },
          }}
          method={{ value: method, onChange: setMethod }}
          ilm={{
            policies: POLICIES,
            selectedPolicyName,
            onSelect: setSelectedPolicyName,
            onInspect: setInspectedPolicyName,
          }}
        />
        <FlyoutFooterWithRetentionWarning
          onCancel={onCancel}
          onApply={onApply}
          isApplyDisabled={inheritLifecycle}
          showWarning={retentionWarning}
        />
      </StreamsFlyoutShell>
      {inspectFlyout}
    </>
  );
};

export const StreamsClassicInheritingDlm: StoryObj = {
  name: 'Streams — classic stream, inheriting DLM from index template',
  render: () => <StreamsClassicInheritingDlmStory />,
};

/**
 * Streams — classic stream, ILM selected, downsampling warning
 *
 * The selected ILM policy contains downsampling steps but the stream is not a
 * time series index (`canUseDownsampling = false`). A warning callout appears
 * in the `FlyoutFooterWithRetentionWarning`.
 * This case only applies to Streams; Index Management does not use the warning footer.
 */
const StreamsClassicIlmWithWarningStory = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [inheritLifecycle, setInheritLifecycle] = useState(false);
  const [method, setMethod] = useState<DataLifecycleMethod>('ilm');
  // Pre-select the policy with downsampling to show the warning immediately.
  const [selectedPolicyName, setSelectedPolicyName] = useState<string>(DOWNSAMPLING_POLICY_NAME);
  const [inspectedPolicyName, setInspectedPolicyName] = useState<string | null>(null);

  const onCancel = () => {
    action('onCancel')();
    setInspectedPolicyName(null);
    setIsOpen(false);
  };

  const onApply = (overrides?: {
    inheritLifecycle?: boolean;
    method?: DataLifecycleMethod;
    ilmPolicyName?: string;
  }) => {
    const effectiveInheritLifecycle = overrides?.inheritLifecycle ?? inheritLifecycle;
    const effectiveMethod = overrides?.method ?? method;
    const effectiveIlmPolicyName = overrides?.ilmPolicyName ?? selectedPolicyName;

    const payload = buildDataLifecycleApplyPayload({
      inheritLifecycle: effectiveInheritLifecycle,
      method: effectiveMethod,
      ilmPolicyName: effectiveIlmPolicyName,
    });
    if (payload) action('onApply')(payload);
    setInspectedPolicyName(null);
    setIsOpen(false);
  };

  const retentionWarning = useRetentionWarning({
    ilmPolicies: POLICIES,
    selectedIlmPolicyName: method === 'ilm' ? selectedPolicyName : undefined,
    canUseDownsampling: false,
    inheritLifecycle,
  });

  const inspectFlyout = (
    <InspectFlyoutIfNeeded
      policies={POLICIES}
      inspectedPolicyName={inspectedPolicyName}
      setInspectedPolicyName={setInspectedPolicyName}
      primaryAction={{
        label: 'Apply',
        onClick: (policyName) => {
          setSelectedPolicyName(policyName);
          setMethod('ilm');
          onApply({ method: 'ilm', ilmPolicyName: policyName });
        },
        'data-test-subj': 'inspectIlmPolicyFlyoutApplyButton',
      }}
      type="push"
    />
  );

  if (!isOpen) {
    return <EuiButton onClick={() => setIsOpen(true)}>Open flyout</EuiButton>;
  }

  return (
    <>
      <StreamsFlyoutShell title="Edit successful data lifecycle">
        <EditDataLifecycleFlyoutBody
          inherit={{
            value: inheritLifecycle,
            onChange: setInheritLifecycle,
            label: 'Inherit lifecycle from index template',
            link: {
              href: '#',
              label: 'Go to index template',
            },
          }}
          method={{ value: method, onChange: setMethod }}
          ilm={{
            policies: POLICIES,
            selectedPolicyName,
            onSelect: setSelectedPolicyName,
            onInspect: setInspectedPolicyName,
          }}
        />
        <FlyoutFooterWithRetentionWarning
          onCancel={onCancel}
          onApply={onApply}
          showWarning={retentionWarning}
        />
      </StreamsFlyoutShell>
      {inspectFlyout}
    </>
  );
};

export const StreamsClassicIlmWithWarning: StoryObj = {
  name: 'Streams — classic stream, ILM with downsampling warning',
  render: () => <StreamsClassicIlmWithWarningStory />,
};

/**
 * Streams — wired non-root stream, serverless
 *
 * On Serverless the ILM option is hidden entirely. The stream can inherit from
 * its parent or configure DLM retention.
 */
const StreamsWiredServerlessStory = () => {
  const [inheritLifecycle, setInheritLifecycle] = useState(false);

  return (
    <StreamsFlyoutShell title="Edit successful data lifecycle">
      <EditDataLifecycleFlyoutBody
        inherit={{
          value: inheritLifecycle,
          onChange: setInheritLifecycle,
          label: 'Inherit lifecycle from parent stream',
          link: {
            href: '#',
            label: 'Go to parent stream',
          },
        }}
      />
      <FlyoutFooterWithRetentionWarning
        onCancel={action('onCancel')}
        onApply={action('onApply')}
        showWarning={false}
      />
    </StreamsFlyoutShell>
  );
};

export const StreamsWiredServerless: StoryObj = {
  name: 'Streams — wired non-root stream (serverless)',
  render: () => <StreamsWiredServerlessStory />,
};

/**
 * Streams — wired non-root stream, inheriting from parent stream (serverless)
 *
 * Same as above but the inherit checkbox is ticked — the stream defers its
 * lifecycle entirely to the parent stream.
 */
const StreamsWiredServerlessInheritingStory = () => {
  const [inheritLifecycle, setInheritLifecycle] = useState(true);

  return (
    <StreamsFlyoutShell title="Edit successful data lifecycle">
      <EditDataLifecycleFlyoutBody
        inherit={{
          value: inheritLifecycle,
          onChange: setInheritLifecycle,
          label: 'Inherit lifecycle from parent stream',
          link: {
            href: '#',
            label: 'Go to parent stream',
          },
        }}
      />
      <FlyoutFooterWithRetentionWarning
        onCancel={action('onCancel')}
        onApply={action('onApply')}
        isApplyDisabled={inheritLifecycle}
        showWarning={false}
      />
    </StreamsFlyoutShell>
  );
};

export const StreamsWiredServerlessInheriting: StoryObj = {
  name: 'Streams — wired non-root stream, inheriting from parent (serverless)',
  render: () => <StreamsWiredServerlessInheritingStory />,
};

/**
 * Streams — root wired stream (stateful)
 *
 * The root stream cannot inherit from a parent, so the inherit section is
 * hidden entirely. The user can choose between DLM and ILM.
 */
const StreamsRootWiredStreamStory = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [method, setMethod] = useState<DataLifecycleMethod>('dlm');
  const [selectedPolicyName, setSelectedPolicyName] = useState<string | undefined>(undefined);
  const [inspectedPolicyName, setInspectedPolicyName] = useState<string | null>(null);

  const onCancel = () => {
    action('onCancel')();
    setInspectedPolicyName(null);
    setIsOpen(false);
  };

  const onApply = (overrides?: {
    inheritLifecycle?: boolean;
    method?: DataLifecycleMethod;
    ilmPolicyName?: string;
  }) => {
    const effectiveInheritLifecycle = overrides?.inheritLifecycle ?? false;
    const effectiveMethod = overrides?.method ?? method;
    const effectiveIlmPolicyName = overrides?.ilmPolicyName ?? selectedPolicyName;

    const payload = buildDataLifecycleApplyPayload({
      inheritLifecycle: effectiveInheritLifecycle,
      method: effectiveMethod,
      ilmPolicyName: effectiveIlmPolicyName,
    });
    if (payload) action('onApply')(payload);
    setInspectedPolicyName(null);
    setIsOpen(false);
  };

  const retentionWarning = useRetentionWarning({
    ilmPolicies: POLICIES,
    selectedIlmPolicyName: method === 'ilm' ? selectedPolicyName : undefined,
    canUseDownsampling: false,
    inheritLifecycle: false,
  });

  const inspectFlyout = (
    <InspectFlyoutIfNeeded
      policies={POLICIES}
      inspectedPolicyName={inspectedPolicyName}
      setInspectedPolicyName={setInspectedPolicyName}
      primaryAction={{
        label: 'Apply',
        onClick: (policyName) => {
          setSelectedPolicyName(policyName);
          setMethod('ilm');
          onApply({ method: 'ilm', ilmPolicyName: policyName });
        },
        'data-test-subj': 'inspectIlmPolicyFlyoutApplyButton',
      }}
      type="push"
    />
  );

  if (!isOpen) {
    return <EuiButton onClick={() => setIsOpen(true)}>Open flyout</EuiButton>;
  }

  return (
    <>
      <StreamsFlyoutShell title="Edit successful data lifecycle">
        <EditDataLifecycleFlyoutBody
          method={{ value: method, onChange: setMethod }}
          ilm={{
            policies: POLICIES,
            selectedPolicyName,
            onSelect: (name) => {
              setSelectedPolicyName(name);
              setMethod('ilm');
            },
            onInspect: setInspectedPolicyName,
          }}
        />
        <FlyoutFooterWithRetentionWarning
          onCancel={onCancel}
          onApply={onApply}
          showWarning={retentionWarning}
        />
      </StreamsFlyoutShell>
      {inspectFlyout}
    </>
  );
};

export const StreamsRootWiredStream: StoryObj = {
  name: 'Streams — root wired stream (stateful)',
  render: () => <StreamsRootWiredStreamStory />,
};

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta: Meta = {
  title: 'Data Lifecycle Phases / Edit Data Lifecycle Flyout Body',
  component: EditDataLifecycleFlyoutBody,
};

export default meta;
