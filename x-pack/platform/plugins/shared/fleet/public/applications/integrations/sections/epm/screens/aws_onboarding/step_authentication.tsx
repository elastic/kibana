/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiAccordion,
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiCallOut,
  EuiCodeBlock,
  EuiFieldPassword,
  EuiFieldText,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiIcon,
  EuiIconTip,
  EuiLink,
  EuiLoadingSpinner,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPanel,
  EuiRadioGroup,
  EuiSelect,
  EuiSpacer,
  EuiSteps,
  EuiText,
  EuiTextColor,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';

import { MANAGED_INTEGRATION_EXAMPLES, type AwsServiceEntry } from './aws_services_data';

// Light lavender-white tint used for card header bands, matched to the
// design reference (Step 14.svg / Deploy & Detect mockups).
const HEADER_TINT = '#F6F9FC';

// EUI's own accordion open/close transition has no prop to slow down — it's
// baked into the .euiAccordion__childWrapper class — so this overrides its
// duration for a more deliberate, less snappy collapse/expand. Safe to set
// directly on EuiAccordion's own `css` prop: its default root style is an
// empty rule (no rules to lose) as long as `borders` stays at its default.
const SLOWER_ACCORDION_TRANSITION = css`
  .euiAccordion__childWrapper {
    transition-duration: 1100ms;
  }
`;

// EuiSteps pads every step's content by size.xxl (40px) for the connecting
// line down to the next step. Wrapping the whole EuiSteps in a negative
// margin does NOT remove this — it only stops that padding from adding
// extra height further out; the 40px gap is still rendered *inside* the
// last step's own content box, between its content and its edge. This
// targets that padding directly, on the last step only (earlier steps keep
// theirs, for the connector line).
const NO_TRAILING_STEP_PADDING = css`
  .euiStep:last-of-type .euiStep__content {
    padding-block-end: 0;
  }
`;

export type DeploymentMethod = 'agent' | 'managed';

export const DEPLOYMENT_METHOD_META: Record<
  DeploymentMethod,
  { label: string; description: string }
> = {
  agent: {
    label: 'Agent-based.',
    description: 'For environments that require an Elastic Agent.',
  },
  managed: {
    label: 'Elastic Managed Integration.',
    description: 'Simpler setup, no agent required.',
  },
};

// Fades its content in on mount instead of snapping into view — used for
// the "Done" badge so completion reads as a subtle acknowledgement rather
// than an instant pop.
const FadeIn: React.FunctionComponent<{ children: React.ReactNode }> = ({ children }) => {
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    // A rAF-driven flip can get fully suspended when the tab isn't visible/
    // focused, so the fade never triggers — a short timeout runs regardless.
    const timer = window.setTimeout(() => setIsVisible(true), 10);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <div
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'scale(1)' : 'scale(0.85)',
        transition: 'opacity 1000ms ease, transform 1000ms ease',
      }}
    >
      {children}
    </div>
  );
};

// A real EuiAccordion driving each card: chevron on the left (before the
// feature icon and title), shaded header band bled to the panel's edges via
// negative margins on the trigger button (parent EuiPanel keeps its normal
// paddingSize="l" and must set `style={{ overflow: 'hidden' }}` to clip the
// square-cornered tint to the panel's rounded corners). A "Done" badge
// appears once the card is complete. `isOpen`/`onToggle` are fully
// controlled by the caller so a group of cards can enforce "only one open
// at a time" sequencing.
const AccordionCard: React.FunctionComponent<{
  id: string;
  iconType: string;
  title: string;
  servicesCount: number;
  isComplete: boolean;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  'data-test-subj'?: string;
}> = ({ id, iconType, title, servicesCount, isComplete, isOpen, onToggle, children, ...rest }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiPanel
      hasBorder
      paddingSize="l"
      // Collapsed cards should show only the shaded header, flush with the
      // panel's rounded bottom corner — the panel's own bottom padding is
      // otherwise still there (nothing pushes against it) and reads as a
      // stray strip of white space.
      style={{ overflow: 'hidden', paddingBottom: isOpen ? undefined : 0 }}
      data-test-subj={rest['data-test-subj']}
    >
      <EuiAccordion
        id={id}
        css={SLOWER_ACCORDION_TRANSITION}
        arrowDisplay="none"
        forceState={isOpen ? 'open' : 'closed'}
        onToggle={onToggle}
        buttonProps={{
          style: {
            display: 'flex',
            margin: `-${euiTheme.size.l} -${euiTheme.size.l} 0`,
            width: `calc(100% + ${euiTheme.size.l} * 2)`,
            padding: euiTheme.size.l,
            background: HEADER_TINT,
            borderBottom: euiTheme.border.thin,
          },
        }}
        buttonContent={
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type={isOpen ? 'arrowDown' : 'arrowRight'} size="s" color="subdued" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiIcon type={iconType} size="m" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="xs">
                <h3>{title}</h3>
              </EuiTitle>
            </EuiFlexItem>
            {isComplete && (
              <EuiFlexItem grow={false}>
                <FadeIn>
                  <EuiBadge color="success" iconType="check">
                    Done
                  </EuiBadge>
                </FadeIn>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <EuiTextColor color="primary">
                  {`${servicesCount} service${servicesCount === 1 ? '' : 's'}`}
                </EuiTextColor>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
      >
        <EuiSpacer size="m" />
        {children}
      </EuiAccordion>
    </EuiPanel>
  );
};

// Enforces "only one card open at a time" across an ordered pair of cards:
// the first starts open, the second closed. When the currently-open card's
// completeness flips to true AND the other card still has work left, the
// accordion waits briefly before collapsing this one and advancing to the
// next — an instant swap would feel like the UI yanking control away rather
// than the user finishing a step. If the other card is already done (this
// was the last one to finish), there's nothing left to advance to, so the
// card is simply left open showing "Done" — collapsing it would just hide
// the very content the user is still looking at. Any card can still be
// clicked open/closed manually at any time.
function useSequentialAccordion(ids: [string, string], completions: [boolean, boolean]) {
  const ADVANCE_DELAY_MS = 900;
  const [activeId, setActiveId] = useState<string | null>(ids[0]);
  const timerRef = useRef<number | null>(null);
  const prevCompletionsRef = useRef<[boolean, boolean]>(completions);

  useEffect(() => {
    const activeIndex = activeId ? ids.indexOf(activeId) : -1;
    if (
      activeIndex !== -1 &&
      !prevCompletionsRef.current[activeIndex] &&
      completions[activeIndex]
    ) {
      const nextIndex = activeIndex === 0 ? 1 : 0;
      if (!completions[nextIndex]) {
        timerRef.current = window.setTimeout(() => {
          setActiveId(ids[nextIndex]);
        }, ADVANCE_DELAY_MS);
      }
    }
    prevCompletionsRef.current = completions;
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completions[0], completions[1], activeId]);

  return {
    isOpen: (id: string) => activeId === id,
    toggle: (id: string) => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setActiveId((current) => (current === id ? null : id));
    },
  };
}

// Every field on this step is constrained to half the card's content width.
const HALF_WIDTH: React.CSSProperties = { maxWidth: '50%' };

const REGION_OPTIONS = [
  { value: 'us-east', text: 'US-East' },
  { value: 'us-west', text: 'US-West' },
  { value: 'eu-west-1', text: 'EU-West-1' },
  { value: 'ap-southeast-1', text: 'AP-Southeast-1' },
];

const STATUS_BADGE_SIZE = 32;

// Colored circle behind the spinner/checkmark (light blue while detecting,
// light green once data is received).
const ServiceStatusBadge: React.FunctionComponent<{ receiving: boolean }> = ({ receiving }) => (
  <div
    style={{
      width: STATUS_BADGE_SIZE,
      height: STATUS_BADGE_SIZE,
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: receiving ? '#EAF3DE' : '#E6F1FA',
      flexShrink: 0,
    }}
  >
    {receiving ? (
      <EuiIcon type="check" color="success" size="m" />
    ) : (
      <EuiLoadingSpinner size="m" />
    )}
  </div>
);

const ServiceDetectionCard: React.FunctionComponent<{
  service: { name: string };
  receiving: boolean;
}> = ({ service, receiving }) => (
  <EuiPanel hasBorder paddingSize="m">
    <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
      <EuiFlexItem grow={false}>
        <ServiceStatusBadge receiving={receiving} />
      </EuiFlexItem>
      <EuiFlexItem style={{ minWidth: 0 }}>
        <EuiText size="s" className="eui-textTruncate">
          <strong>{service.name}</strong>
        </EuiText>
        <EuiText size="xs" color="subdued">
          {receiving ? 'Receiving data' : 'Detecting data...'}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanel>
);

// Small fade/scale-in checkmark shown once a field is confirmed — subtle
// enough to read as an acknowledgement, not a loud success state.
const CheckIndicator: React.FunctionComponent<{ visible: boolean }> = ({ visible }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      opacity: visible ? 1 : 0,
      transform: visible ? 'scale(1)' : 'scale(0.6)',
      transition: 'opacity 250ms ease, transform 250ms ease',
    }}
  >
    <EuiIcon type="check" color="success" size="m" />
  </div>
);

// A text field that confirms itself — once the user tabs/clicks away or
// presses Enter with non-empty content, a small check fades in on the
// right. Editing the value again clears the check until it's reconfirmed.
const ConfirmableFieldText: React.FunctionComponent<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel: string;
  dataTestSubj: string;
  disabled?: boolean;
}> = ({ value, onChange, placeholder, ariaLabel, dataTestSubj, disabled }) => {
  const [isConfirmed, setIsConfirmed] = useState(false);
  const confirm = () => setIsConfirmed(value.trim().length > 0);

  return (
    <EuiFieldText
      fullWidth
      placeholder={placeholder}
      value={value}
      disabled={disabled}
      onChange={(e) => {
        onChange(e.target.value);
        setIsConfirmed(false);
      }}
      onBlur={confirm}
      onKeyDown={(e) => {
        if (e.key === 'Enter') confirm();
      }}
      append={<CheckIndicator visible={isConfirmed} />}
      aria-label={ariaLabel}
      data-test-subj={dataTestSubj}
    />
  );
};

// Elastic Cloud Forwarder widget — owns the FULL CloudFormation lifecycle:
// launch → per-service detection animation → stack name/version capture.
// Deploy state is lifted to the parent flow so Detect & Review can read it.
// Open/closed state is controlled by the parent's sequential accordion.
const CloudFormationWidget: React.FunctionComponent<{
  services: AwsServiceEntry[];
  region: string;
  onRegionChange: (value: string) => void;
  isLaunched: boolean;
  onLaunch: () => void;
  receivedCount: number;
  stackName: string;
  onStackNameChange: (value: string) => void;
  stackVersion: string;
  onStackVersionChange: (value: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  onCompleteChange: (isComplete: boolean) => void;
}> = ({
  services,
  region,
  onRegionChange,
  isLaunched,
  onLaunch,
  receivedCount,
  stackName,
  onStackNameChange,
  stackVersion,
  onStackVersionChange,
  isOpen,
  onToggle,
  onCompleteChange,
}) => {
  const allReceived = services.length > 0 && receivedCount >= services.length;
  const isComplete =
    allReceived && stackName.trim().length > 0 && stackVersion.trim().length > 0;

  useEffect(() => {
    onCompleteChange(isComplete);
  }, [isComplete, onCompleteChange]);

  return (
    <AccordionCard
      id="awsOnboardingCloudFormationAccordion"
      iconType="rocket"
      title="Elastic Cloud Forwarder"
      servicesCount={services.length}
      isComplete={isComplete}
      isOpen={isOpen}
      onToggle={onToggle}
      data-test-subj="awsOnboardingCloudFormationCollapseToggle"
    >
      <EuiText size="s">
        <p>
          Log collection via a single AWS CloudFormation stack — no agents required. Trigger
          source (S3 or CloudWatch) is configured per service in Service settings. Launch
          CloudFormation to deploy.
        </p>
      </EuiText>
      <EuiSpacer size="m" />

      <EuiFormRow
        label={
          <span>
            Select region{' '}
            <EuiIconTip
              content="The AWS region where the CloudFormation stack is deployed."
              position="right"
            />
          </span>
        }
        style={HALF_WIDTH}
        fullWidth
      >
        <EuiSelect
          fullWidth
          options={REGION_OPTIONS}
          value={region}
          onChange={(e) => onRegionChange(e.target.value)}
          disabled={isLaunched}
          aria-label="Select region"
        />
      </EuiFormRow>
      <EuiSpacer size="m" />

      {!isLaunched ? (
        <EuiButton
          iconType="popout"
          iconSide="right"
          onClick={onLaunch}
          data-test-subj="awsOnboardingStep3LaunchCloudFormation"
        >
          Launch CloudFormation
        </EuiButton>
      ) : !allReceived ? (
        <EuiButton isLoading disabled data-test-subj="awsOnboardingStep3CloudFormationDeploying">
          Cloudformation stack deploying...
        </EuiButton>
      ) : (
        <EuiText size="s">
          <p>
            The Elastic Cloud Forwarder has been created in your AWS account. Log collection is
            now active.
          </p>
        </EuiText>
      )}

      {isLaunched && (
        <>
          <EuiSpacer size="m" />
          <EuiText size="s" color="subdued">
            {`${receivedCount} of ${services.length} - data received`}
          </EuiText>
          <EuiSpacer size="s" />
          <EuiFlexGrid columns={4} gutterSize="m">
            {services.map((service, i) => (
              <EuiFlexItem key={service.id} style={{ minWidth: 0 }}>
                <ServiceDetectionCard service={service} receiving={i < receivedCount} />
              </EuiFlexItem>
            ))}
          </EuiFlexGrid>
        </>
      )}

      {allReceived && (
        <>
          <EuiSpacer size="l" />
          <EuiText size="s">
            <p>Copy the stack name and stack version from AWS Console and paste it below:</p>
          </EuiText>
          <EuiSpacer size="s" />
          <EuiFormRow
            label={
              <span>
                Stack name{' '}
                <EuiIconTip
                  content="Used to link this deployment to the CloudFormation stack in your account."
                  position="right"
                />
              </span>
            }
            style={HALF_WIDTH}
            fullWidth
          >
            <ConfirmableFieldText
              value={stackName}
              onChange={onStackNameChange}
              placeholder="e.g.: elastic-cloud-forwarder-xxxx"
              ariaLabel="Stack name"
              dataTestSubj="awsOnboardingStackName"
            />
          </EuiFormRow>
          <EuiFormRow
            label={
              <span>
                Stack version{' '}
                <EuiIconTip
                  content="The version of the CloudFormation stack deployed in your account."
                  position="right"
                />
              </span>
            }
            style={HALF_WIDTH}
            fullWidth
          >
            <ConfirmableFieldText
              value={stackVersion}
              onChange={onStackVersionChange}
              placeholder="e.g.: 1.0.0"
              ariaLabel="Stack version"
              dataTestSubj="awsOnboardingStackVersion"
            />
          </EuiFormRow>
        </>
      )}
    </AccordionCard>
  );
};

type ManagedAccessMethod = 'access_keys' | 'identity_federation';

// Managed Integrations widget — the single credentials card for the managed
// path (the separate "Setup access" card was removed as a duplicate).
// Defaults to Identity Federation; the Federated Identity Name is lifted to
// the parent flow so Detect & Review's summary can read it. Like the Cloud
// Forwarder card, it owns its own deploy CTA + arrival animation so the
// Detect & Review summary arrives already settled. Open/closed state is
// controlled by the parent's sequential accordion.
const ManagedIntegrationsWidget: React.FunctionComponent<{
  servicesCount: number;
  onValidityChange: (isValid: boolean) => void;
  identityName: string;
  onIdentityNameChange: (value: string) => void;
  isDeployed: boolean;
  onDeploy: () => void;
  receivedCount: number;
  isOpen: boolean;
  onToggle: () => void;
  onCompleteChange: (isComplete: boolean) => void;
}> = ({
  servicesCount,
  onValidityChange,
  identityName,
  onIdentityNameChange,
  isDeployed,
  onDeploy,
  receivedCount,
  isOpen,
  onToggle,
  onCompleteChange,
}) => {
  const [method, setMethod] = useState<ManagedAccessMethod>('identity_federation');
  const [accessKeyId, setAccessKeyId] = useState('');
  const [isAccessKeyIdTouched, setIsAccessKeyIdTouched] = useState(false);
  const [secretAccessKey, setSecretAccessKey] = useState('');
  const [isIdentityNameTouched, setIsIdentityNameTouched] = useState(false);
  const [roleArn, setRoleArn] = useState('');
  const [isRoleArnTouched, setIsRoleArnTouched] = useState(false);

  const isAccessKeyIdInvalid = isAccessKeyIdTouched && accessKeyId.trim().length === 0;
  const isIdentityNameInvalid = isIdentityNameTouched && identityName.trim().length === 0;
  const isRoleArnInvalid = isRoleArnTouched && roleArn.trim().length === 0;

  const isValid =
    method === 'access_keys'
      ? accessKeyId.trim().length > 0 && secretAccessKey.trim().length > 0
      : identityName.trim().length > 0 && roleArn.trim().length > 0;

  useEffect(() => {
    onValidityChange(isValid);
  }, [isValid, onValidityChange]);

  const allReceived = receivedCount >= MANAGED_INTEGRATION_EXAMPLES.length;
  const isComplete = isDeployed && allReceived;

  useEffect(() => {
    onCompleteChange(isComplete);
  }, [isComplete, onCompleteChange]);

  return (
    <AccordionCard
      id="awsOnboardingManagedIntegrationsAccordion"
      iconType="package"
      title="Managed Integrations"
      servicesCount={servicesCount}
      isComplete={isComplete}
      isOpen={isOpen}
      onToggle={onToggle}
      data-test-subj="awsOnboardingManagedIntegrationsCollapseToggle"
    >
      <EuiText size="s">
        <p>
          Utilize AWS Access Keys or Federated Identity to set up and deploy your AWS account.
          Refer to our{' '}
          <EuiLink href="#" target="_blank" external>
            Getting Started
          </EuiLink>{' '}
          guide for details.
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiRadioGroup
        options={[
          { id: 'identity_federation', label: 'Identity Federation' },
          { id: 'access_keys', label: 'Access Keys' },
        ]}
        idSelected={method}
        onChange={(id) => setMethod(id as ManagedAccessMethod)}
        name="awsOnboardingManagedIntegrationsMethod"
        legend={{ children: 'Preferred method' }}
        data-test-subj="awsOnboardingManagedIntegrationsMethodRadioGroup"
      />
      <EuiSpacer size="m" />

      {method === 'access_keys' ? (
        <>
          <EuiFormRow
            label="Access key ID"
            isInvalid={isAccessKeyIdInvalid}
            error="Required"
            style={HALF_WIDTH}
            fullWidth
          >
            <EuiFieldText
              fullWidth
              placeholder="e.g.: AKIAIOSFODNN7EXAMPLE"
              value={accessKeyId}
              onChange={(e) => setAccessKeyId(e.target.value)}
              onBlur={() => setIsAccessKeyIdTouched(true)}
              isInvalid={isAccessKeyIdInvalid}
              aria-label="Access key ID"
              data-test-subj="awsOnboardingManagedAccessKeyId"
            />
          </EuiFormRow>
          <EuiFormRow label="Secret access key" style={HALF_WIDTH} fullWidth>
            <EuiFieldPassword
              type="dual"
              fullWidth
              placeholder="e.g.: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
              value={secretAccessKey}
              onChange={(e) => setSecretAccessKey(e.target.value)}
              aria-label="Secret access key"
              data-test-subj="awsOnboardingManagedSecretAccessKey"
            />
          </EuiFormRow>
        </>
      ) : (
        <>
          <EuiFormRow
            label="Federated Identity Name"
            isInvalid={isIdentityNameInvalid}
            error="Federated Identity Name is required"
            style={HALF_WIDTH}
            fullWidth
          >
            <EuiFieldText
              fullWidth
              placeholder="e.g.: elastic-forwarder-prod"
              value={identityName}
              onChange={(e) => onIdentityNameChange(e.target.value)}
              onBlur={() => setIsIdentityNameTouched(true)}
              isInvalid={isIdentityNameInvalid}
              aria-label="Federated Identity Name"
              data-test-subj="awsOnboardingManagedFederatedIdentityName"
            />
          </EuiFormRow>
          <EuiSpacer size="s" />
          <EuiAccordion id="awsOnboardingStepsToAssumeRole" buttonContent="Steps to assume role">
            <EuiSpacer size="s" />
            <EuiText size="s" color="subdued">
              <ol>
                <li>
                  Log in as an <strong>admin</strong> in the AWS account you want to onboard
                </li>
                <li>
                  (Optional) Change the <strong>AWS region</strong> in the upper right corner to
                  the region you want to deploy your stack to
                </li>
                <li>
                  Tick the checkbox under <strong>capabilities</strong> in the opened
                  CloudFormation stack review form:{' '}
                  <strong>
                    I acknowledge that AWS CloudFormation might create IAM resources.
                  </strong>
                </li>
                <li>
                  Click <strong>Create stack</strong>.
                </li>
                <li>
                  Once stack status is <strong>CREATE_COMPLETE</strong> then click the Outputs tab
                </li>
                <li>
                  Copy <strong>Role ARN</strong> and <strong>External ID</strong> then paste the
                  role credentials below
                </li>
              </ol>
            </EuiText>
          </EuiAccordion>
          <EuiSpacer size="m" />
          <EuiFormRow
            label="Role ARN"
            isInvalid={isRoleArnInvalid}
            error="Role ARN is required"
            style={HALF_WIDTH}
            fullWidth
          >
            <EuiFieldText
              fullWidth
              placeholder="arn:aws:iam::123456789012:role/elastic-forwarder"
              value={roleArn}
              onChange={(e) => setRoleArn(e.target.value)}
              onBlur={() => setIsRoleArnTouched(true)}
              isInvalid={isRoleArnInvalid}
              aria-label="Role ARN"
              data-test-subj="awsOnboardingManagedRoleArn"
            />
          </EuiFormRow>
        </>
      )}

      <EuiSpacer size="m" />
      {!isDeployed ? (
        <EuiButton
          isDisabled={!isValid}
          onClick={onDeploy}
          data-test-subj="awsOnboardingDeployManagedIntegrations"
        >
          Deploy integrations
        </EuiButton>
      ) : !allReceived ? (
        <EuiButton isLoading disabled data-test-subj="awsOnboardingManagedIntegrationsDeploying">
          Deploying integrations...
        </EuiButton>
      ) : (
        <EuiText size="s">
          <p>Managed integration data streams are connected. Data collection is now active.</p>
        </EuiText>
      )}

      {isDeployed && (
        <>
          <EuiSpacer size="m" />
          <EuiText size="s" color="subdued">
            {`${receivedCount} of ${MANAGED_INTEGRATION_EXAMPLES.length} - data received`}
          </EuiText>
          <EuiSpacer size="s" />
          <EuiFlexGrid columns={4} gutterSize="m">
            {MANAGED_INTEGRATION_EXAMPLES.map((name, i) => (
              <EuiFlexItem key={name} style={{ minWidth: 0 }}>
                <ServiceDetectionCard service={{ name }} receiving={i < receivedCount} />
              </EuiFlexItem>
            ))}
          </EuiFlexGrid>
        </>
      )}
    </AccordionCard>
  );
};

type HostMode = 'new_hosts' | 'existing_hosts';

// Agent path — "Where to add this integration?" card, mirroring Fleet's
// package-policy step (New hosts / Existing hosts converted from tabs to a
// radio choice, per the flow's one-or-the-other convention). "New hosts"
// contains the entire add-agent flow inline (no separate card): install
// commands, simulated enrollment, and per-service incoming-data tiles.
// Enrollment in Fleet is the default (no mode choice); the "Listening for
// agent" state confirms a few seconds after the section appears, which in
// turn unblocks the step's Next button. Open/closed state is controlled by
// the parent's sequential accordion.
const WhereToAddCard: React.FunctionComponent<{
  services: AwsServiceEntry[];
  isEnrolled: boolean;
  onEnrolled: () => void;
  receivedCount: number;
  isOpen: boolean;
  onToggle: () => void;
  onCompleteChange: (isComplete: boolean) => void;
}> = ({ services, isEnrolled, onEnrolled, receivedCount, isOpen, onToggle, onCompleteChange }) => {
  const [hostMode, setHostMode] = useState<HostMode>('new_hosts');
  // Selecting "New hosts" only reveals the confirmation CTA — the install/
  // enrollment flow below it doesn't start until the user explicitly
  // commits, so they still get a real chance to pick "Existing hosts"
  // instead before anything runs automatically.
  const [isNewHostsConfirmed, setIsNewHostsConfirmed] = useState(false);
  const [existingPolicyId, setExistingPolicyId] = useState('');
  const [platform, setPlatform] = useState('linux');
  const enrollTimer = useRef<number | null>(null);
  const servicesCount = services.length;
  const allReceived = servicesCount > 0 && receivedCount >= servicesCount;
  const isComplete = hostMode === 'new_hosts' && isEnrolled && allReceived;
  const { euiTheme } = useEuiTheme();

  useEffect(() => {
    onCompleteChange(isComplete);
  }, [isComplete, onCompleteChange]);

  useEffect(() => {
    if (hostMode !== 'new_hosts') setIsNewHostsConfirmed(false);
  }, [hostMode]);

  useEffect(() => {
    if (isEnrolled || hostMode !== 'new_hosts' || !isNewHostsConfirmed) return;
    enrollTimer.current = window.setTimeout(onEnrolled, 8000);
    return () => {
      if (enrollTimer.current) window.clearTimeout(enrollTimer.current);
    };
  }, [isEnrolled, hostMode, isNewHostsConfirmed, onEnrolled]);

  return (
    <AccordionCard
      id="awsOnboardingWhereToAddAccordion"
      iconType="compute"
      title="Where to add this integration?"
      servicesCount={servicesCount}
      isComplete={isComplete}
      isOpen={isOpen}
      onToggle={onToggle}
      data-test-subj="awsOnboardingWhereToAddCollapseToggle"
    >
      <EuiRadioGroup
        options={[
          { id: 'new_hosts', label: 'New host' },
          { id: 'existing_hosts', label: 'Existing hosts' },
        ]}
        idSelected={hostMode}
        onChange={(id) => setHostMode(id as HostMode)}
        name="awsOnboardingAgentHostMode"
        legend={{ children: 'Hosts' }}
        data-test-subj="awsOnboardingAgentHostModeRadioGroup"
      />
      <EuiSpacer size="m" />

      {hostMode === 'new_hosts' ? (
        <>
          <EuiText size="s" color="subdued">
            <p>
              Add Elastic Agents to your hosts to collect data and send it to the Elastic Stack.
              Agents enroll in Fleet by default, so updates deploy automatically and agents are
              centrally managed.
            </p>
          </EuiText>
          <EuiSpacer size="m" />

          {!isNewHostsConfirmed ? (
            <EuiButton
              onClick={() => setIsNewHostsConfirmed(true)}
              data-test-subj="awsOnboardingConfirmNewHosts"
            >
              Deploy new host
            </EuiButton>
          ) : (
          <div css={NO_TRAILING_STEP_PADDING}>
            <EuiSteps
              titleSize="xs"
              steps={[
                {
                  title: 'Install Elastic Agent on your host',
                  children: (
                    <>
                      <EuiText size="s">
                        <p>
                          Select the appropriate platform and run commands to install, enroll,
                          and start Elastic Agent. Reuse commands to set up agents on more than
                          one host. All builds can be found on our{' '}
                          <EuiLink href="#" target="_blank" external>
                            downloads page
                          </EuiLink>
                          . For additional guidance, see our{' '}
                          <EuiLink href="#" target="_blank" external>
                            installation docs
                          </EuiLink>
                          .
                        </p>
                      </EuiText>
                      <EuiSpacer size="m" />
                      <EuiCallOut title="Root privileges required" color="warning" iconType="alert">
                        <p>
                          This agent policy contains the following integrations that require
                          Elastic Agents to have root privileges. To ensure that all data
                          required by the integrations can be collected, enroll the agents using
                          an account with root privileges. For more information, see the{' '}
                          <EuiLink href="#" target="_blank" external>
                            Fleet and Elastic Agent Guide
                          </EuiLink>
                        </p>
                        <ul>
                          <li>System</li>
                        </ul>
                      </EuiCallOut>
                      <EuiSpacer size="m" />
                      <EuiText size="s">
                        <p>
                          To install Elastic Agent without root privileges, add the{' '}
                          <code>--unprivileged</code> flag to the{' '}
                          <code>elastic-agent install</code> command below. For more information,
                          see the{' '}
                          <EuiLink href="#" target="_blank" external>
                            Fleet and Elastic Agent Guide
                          </EuiLink>
                        </p>
                      </EuiText>
                      <EuiSpacer size="m" />
                      <EuiButtonGroup
                        legend="Platform"
                        options={AGENT_PLATFORM_OPTIONS}
                        idSelected={platform}
                        onChange={setPlatform}
                        buttonSize="compressed"
                      />
                      <EuiSpacer size="s" />
                      <EuiCodeBlock language="bash" isCopyable paddingSize="m">
                        {AGENT_INSTALL_COMMANDS}
                      </EuiCodeBlock>
                    </>
                  ),
                },
                {
                  title: 'Confirm agent enrollment',
                  status: isEnrolled ? 'complete' : 'loading',
                  children: (
                    <>
                      <EuiFlexGrid columns={4} gutterSize="m">
                        <EuiFlexItem style={{ minWidth: 0 }}>
                          <EuiPanel
                            hasBorder
                            paddingSize="m"
                            data-test-subj="awsOnboardingAgentEnrollmentTile"
                          >
                            <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
                              <EuiFlexItem grow={false}>
                                <ServiceStatusBadge receiving={isEnrolled} />
                              </EuiFlexItem>
                              <EuiFlexItem style={{ minWidth: 0 }}>
                                <EuiText size="s" className="eui-textTruncate">
                                  <strong>Elastic Agent</strong>
                                </EuiText>
                                <EuiText size="xs" color="subdued">
                                  {isEnrolled ? '1 agent enrolled' : 'Listening for agent...'}
                                </EuiText>
                              </EuiFlexItem>
                            </EuiFlexGroup>
                          </EuiPanel>
                        </EuiFlexItem>
                      </EuiFlexGrid>
                      {!isEnrolled && (
                        <>
                          <EuiSpacer size="s" />
                          <EuiText size="s" color="subdued">
                            <p>
                              After the agent starts up, the Elastic Stack listens for the agent
                              and confirms the enrollment in Fleet. If you&apos;re having trouble
                              connecting, check out the{' '}
                              <EuiLink href="#" target="_blank" external>
                                troubleshooting guide
                              </EuiLink>
                              .
                            </p>
                          </EuiText>
                        </>
                      )}
                    </>
                  ),
                },
                {
                  title: 'Confirm incoming data',
                  status: !isEnrolled ? 'incomplete' : allReceived ? 'complete' : 'loading',
                  children: !isEnrolled ? (
                    <EuiText size="s" color="subdued">
                      <p>Waiting for agent enrollment.</p>
                    </EuiText>
                  ) : (
                    <>
                      <EuiText size="s" color="subdued">
                        {`${receivedCount} of ${servicesCount} - data received`}
                      </EuiText>
                      <EuiSpacer size="s" />
                      <EuiFlexGrid columns={4} gutterSize="m">
                        {services.map((service, i) => (
                          <EuiFlexItem key={service.id} style={{ minWidth: 0 }}>
                            <ServiceDetectionCard
                              service={service}
                              receiving={i < receivedCount}
                            />
                          </EuiFlexItem>
                        ))}
                      </EuiFlexGrid>
                    </>
                  ),
                },
              ]}
            />
          </div>
          )}
        </>
      ) : (
        <>
          <EuiTitle size="xxs">
            <h4>Agent policies</h4>
          </EuiTitle>
          <EuiSpacer size="xs" />
          <EuiText size="s" color="subdued">
            <p>Agent policies are used to manage a group of integrations across a set of agents.</p>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiFormRow label="Agent policies" style={HALF_WIDTH} fullWidth>
            <EuiSelect
              fullWidth
              options={[{ value: '', text: 'No agent policies available' }]}
              value={existingPolicyId}
              onChange={(e) => setExistingPolicyId(e.target.value)}
              aria-label="Select agent policies to add this integration to"
              data-test-subj="awsOnboardingExistingAgentPolicies"
              // No real option to select yet — render the "no policies" text
              // in the same subdued tone as a placeholder, not as if it were
              // an active, selectable choice.
              style={!existingPolicyId ? { color: euiTheme.colors.subduedText } : undefined}
            />
          </EuiFormRow>
          <EuiText size="xs" color="subdued">
            <p>
              There aren&apos;t any options available.{' '}
              <EuiLink href="#" target="_blank" external data-test-subj="awsOnboardingAddNewPolicy">
                Add a new policy
              </EuiLink>
            </p>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiButton
            isDisabled={!existingPolicyId}
            data-test-subj="awsOnboardingDeployExistingHosts"
          >
            Deploy hosts
          </EuiButton>
        </>
      )}
    </AccordionCard>
  );
};

const AGENT_PLATFORM_OPTIONS = [
  { id: 'linux', label: 'Linux aarch64' },
  { id: 'macos', label: 'MacOS aarch64' },
  { id: 'deb', label: 'DEB aarch64' },
  { id: 'rpm', label: 'RPM aarch64' },
];

const AGENT_INSTALL_COMMANDS = `curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.5.0-linux-arm64.tar.gz
tar xzvf elastic-agent-9.5.0-linux-arm64.tar.gz
cd elastic-agent-9.5.0-linux-arm64
sudo ./elastic-agent install --url=https://4fc1b088ce026fc9e70a6a0c28b0c58f.fleet.us-east-1.aws.elastic.cloud:443 --enrollment-token=RGVmYXVsdC0wNDE0YTZiLTA5OTY=`;

export const StepAuthentication: React.FunctionComponent<{
  services: AwsServiceEntry[];
  deploymentMethod: DeploymentMethod;
  onDeploymentMethodChange: (method: DeploymentMethod) => void;
  onCredentialsValidChange: (isValid: boolean) => void;
  deployIdentityName: string;
  onDeployIdentityNameChange: (value: string) => void;
  deployRegion: string;
  onDeployRegionChange: (value: string) => void;
  isDeployed: boolean;
  onLaunchCloudFormation: () => void;
  receivedCount: number;
  stackName: string;
  onStackNameChange: (value: string) => void;
  stackVersion: string;
  onStackVersionChange: (value: string) => void;
  isAgentEnrolled: boolean;
  onAgentEnrolled: () => void;
  isManagedDeployed: boolean;
  onDeployManagedIntegrations: () => void;
  managedReceivedCount: number;
  agentReceivedCount: number;
}> = ({
  services,
  deploymentMethod,
  onDeploymentMethodChange,
  onCredentialsValidChange,
  deployIdentityName,
  onDeployIdentityNameChange,
  deployRegion,
  onDeployRegionChange,
  isDeployed,
  onLaunchCloudFormation,
  receivedCount,
  stackName,
  onStackNameChange,
  stackVersion,
  onStackVersionChange,
  isAgentEnrolled,
  onAgentEnrolled,
  isManagedDeployed,
  onDeployManagedIntegrations,
  managedReceivedCount,
  agentReceivedCount,
}) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [pendingMethod, setPendingMethod] = useState<DeploymentMethod>(deploymentMethod);
  const [agentAccessKeyId, setAgentAccessKeyId] = useState('');
  const [agentSecretAccessKey, setAgentSecretAccessKey] = useState('');
  const [managedIntegrationsValid, setManagedIntegrationsValid] = useState(false);

  const servicesCount = services.length;

  const isAgentSetupAccessComplete =
    agentAccessKeyId.trim().length > 0 && agentSecretAccessKey.trim().length > 0;

  // Sequential ("only one open at a time") accordions for each path's card
  // pair — the first card starts open, the second closed, and completing
  // the active card advances to the next after a short, deliberate delay.
  const [isManagedIntegrationsComplete, setIsManagedIntegrationsComplete] = useState(false);
  const [isCloudFormationComplete, setIsCloudFormationComplete] = useState(false);
  const managedAccordion = useSequentialAccordion(
    ['managedIntegrations', 'cloudFormation'],
    [isManagedIntegrationsComplete, isCloudFormationComplete]
  );

  const [isWhereToAddComplete, setIsWhereToAddComplete] = useState(false);
  const agentAccordion = useSequentialAccordion(
    ['whereToAdd', 'setupAccess'],
    [isWhereToAddComplete, isAgentSetupAccessComplete]
  );

  const openModal = () => {
    setPendingMethod(deploymentMethod);
    setIsEditModalOpen(true);
  };

  const meta = DEPLOYMENT_METHOD_META[deploymentMethod];
  const { euiTheme } = useEuiTheme();

  useEffect(() => {
    const isValid =
      deploymentMethod === 'agent'
        ? agentAccessKeyId.trim().length > 0 && agentSecretAccessKey.trim().length > 0
        : managedIntegrationsValid;
    onCredentialsValidChange(isValid);
  }, [
    deploymentMethod,
    agentAccessKeyId,
    agentSecretAccessKey,
    managedIntegrationsValid,
    onCredentialsValidChange,
  ]);

  return (
    <>
      <EuiTitle size="m">
        <h2>Authenticate &amp; Deploy</h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        <p>
          Select a deployment method, provide the credentials needed to connect your AWS services
          to Elastic, and deploy.
        </p>
      </EuiText>
      <EuiSpacer size="m" />

      <EuiPanel
        hasBorder
        paddingSize="l"
        style={{ overflow: 'hidden' }}
        data-test-subj="awsOnboardingDeploymentMethodPanel"
      >
        <div
          style={{
            margin: `-${euiTheme.size.l} -${euiTheme.size.l}`,
            padding: euiTheme.size.l,
            background: HEADER_TINT,
          }}
        >
          <EuiFlexGroup alignItems="flexStart" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type="gear" size="m" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="xs">
                <h3>Deployment method</h3>
              </EuiTitle>
              <EuiSpacer size="s" />
              <EuiText size="s">
                <strong>{meta.label}</strong>{' '}
                <EuiText size="s" color="subdued" component="span">
                  {meta.description}
                </EuiText>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiLink onClick={openModal} data-test-subj="awsOnboardingEditDeploymentMethod">
                Edit
              </EuiLink>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </EuiPanel>

      <EuiHorizontalRule margin="l" />

      {deploymentMethod === 'agent' ? (
        <>
          <WhereToAddCard
            services={services}
            isEnrolled={isAgentEnrolled}
            onEnrolled={onAgentEnrolled}
            receivedCount={agentReceivedCount}
            isOpen={agentAccordion.isOpen('whereToAdd')}
            onToggle={() => agentAccordion.toggle('whereToAdd')}
            onCompleteChange={setIsWhereToAddComplete}
          />
          <EuiSpacer size="m" />
          <AccordionCard
            id="awsOnboardingAgentSetupAccessAccordion"
            iconType="rocket"
            title="Setup access"
            servicesCount={servicesCount}
            isComplete={isAgentSetupAccessComplete}
            isOpen={agentAccordion.isOpen('setupAccess')}
            onToggle={() => agentAccordion.toggle('setupAccess')}
            data-test-subj="awsOnboardingAgentSetupAccessCollapseToggle"
          >
            <EuiFormRow
              label={
                <span>
                  Preferred method{' '}
                  <EuiIconTip
                    content="How Elastic Agent authenticates against your AWS account."
                    position="right"
                  />
                </span>
              }
              style={HALF_WIDTH}
              fullWidth
            >
              <EuiSelect
                fullWidth
                options={[
                  { value: 'access_key', text: 'Direct Access Key' },
                  { value: 'temporary', text: 'Temporary security credentials' },
                  { value: 'shared', text: 'Shared credentials file' },
                  { value: 'iam_role', text: 'IAM role ARN' },
                ]}
                aria-label="Preferred authentication method"
              />
            </EuiFormRow>
            <EuiFormRow label="Access Key ID" style={HALF_WIDTH} fullWidth>
              <EuiFieldPassword
                type="dual"
                fullWidth
                placeholder="e.g.: AKIAIOSFODNN7EXAMPLE"
                value={agentAccessKeyId}
                onChange={(e) => setAgentAccessKeyId(e.target.value)}
                aria-label="Access Key ID"
                data-test-subj="awsOnboardingAgentAccessKeyId"
              />
            </EuiFormRow>
            <EuiFormRow label="Secret Access Key" style={HALF_WIDTH} fullWidth>
              <EuiFieldPassword
                type="dual"
                fullWidth
                placeholder="e.g.: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                value={agentSecretAccessKey}
                onChange={(e) => setAgentSecretAccessKey(e.target.value)}
                aria-label="Secret Access Key"
                data-test-subj="awsOnboardingAgentSecretAccessKey"
              />
            </EuiFormRow>
          </AccordionCard>
        </>
      ) : (
        <>
          <ManagedIntegrationsWidget
            servicesCount={servicesCount}
            onValidityChange={setManagedIntegrationsValid}
            identityName={deployIdentityName}
            onIdentityNameChange={onDeployIdentityNameChange}
            isDeployed={isManagedDeployed}
            onDeploy={onDeployManagedIntegrations}
            receivedCount={managedReceivedCount}
            isOpen={managedAccordion.isOpen('managedIntegrations')}
            onToggle={() => managedAccordion.toggle('managedIntegrations')}
            onCompleteChange={setIsManagedIntegrationsComplete}
          />
          <EuiSpacer size="m" />
          <CloudFormationWidget
            services={services}
            region={deployRegion}
            onRegionChange={onDeployRegionChange}
            isLaunched={isDeployed}
            onLaunch={onLaunchCloudFormation}
            receivedCount={receivedCount}
            stackName={stackName}
            onStackNameChange={onStackNameChange}
            stackVersion={stackVersion}
            onStackVersionChange={onStackVersionChange}
            isOpen={managedAccordion.isOpen('cloudFormation')}
            onToggle={() => managedAccordion.toggle('cloudFormation')}
            onCompleteChange={setIsCloudFormationComplete}
          />
        </>
      )}

      {isEditModalOpen && (
        <EuiModal
          onClose={() => setIsEditModalOpen(false)}
          data-test-subj="awsOnboardingDeploymentMethodModal"
          style={{ width: 400 }}
        >
          <EuiModalHeader>
            <EuiModalHeaderTitle>Edit deployment method</EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <EuiText size="s">
              <p>
                The deployment method determines how Elastic connects to and collects data from
                your AWS services.
              </p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiSelect
              fullWidth
              options={[
                { value: 'managed', text: 'Elastic Managed Integrations' },
                { value: 'agent', text: 'Agent-based' },
              ]}
              value={pendingMethod}
              onChange={(e) => setPendingMethod(e.target.value as DeploymentMethod)}
              aria-label="Deployment method"
            />
          </EuiModalBody>
          <EuiModalFooter>
            <EuiButtonEmpty onClick={() => setIsEditModalOpen(false)}>Cancel</EuiButtonEmpty>
            <EuiButton
              fill
              onClick={() => {
                onDeploymentMethodChange(pendingMethod);
                setIsEditModalOpen(false);
              }}
              data-test-subj="awsOnboardingSaveDeploymentMethod"
            >
              Save
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      )}
    </>
  );
};
