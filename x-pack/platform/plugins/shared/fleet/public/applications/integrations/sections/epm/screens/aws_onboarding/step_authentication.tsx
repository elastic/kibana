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
  EuiCodeBlock,
  EuiComboBox,
  EuiFieldPassword,
  EuiFieldText,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
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
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { KbnDangerCallout, KbnWarningCallout } from '@kbn/ui-callout';

import {
  AWS_SCHEMA_META,
  type AwsSchema,
  type AwsServiceEntry,
} from './aws_services_data';

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
            background: euiTheme.colors.backgroundBaseSubdued,
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
              <EuiText size="s" color="subdued">
                {`${servicesCount} service${servicesCount === 1 ? '' : 's'}`}
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

const STATUS_BADGE_SIZE = 32;

// Colored circle behind the spinner/checkmark (light primary while
// detecting, light success once data is received).
const ServiceStatusBadge: React.FunctionComponent<{ receiving: boolean }> = ({ receiving }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      style={{
        width: STATUS_BADGE_SIZE,
        height: STATUS_BADGE_SIZE,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: receiving
          ? euiTheme.colors.backgroundLightSuccess
          : euiTheme.colors.backgroundLightPrimary,
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
};

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

// Elastic Cloud Forwarder widget — owns the CloudFormation launch and stack
// name capture. Per-service data-arrival detection is intentionally NOT
// shown here anymore — it starts in the background as soon as the stack is
// launched, but is only surfaced on Detect & Review (step 4), so this step
// doesn't block the user on waiting for data to arrive. Deploy state is
// lifted to the parent flow so Detect & Review can read it. Open/closed
// state is controlled by the parent's sequential accordion.
const CloudFormationWidget: React.FunctionComponent<{
  services: AwsServiceEntry[];
  schema: AwsSchema;
  isLaunched: boolean;
  onLaunch: () => void;
  stackName: string;
  onStackNameChange: (value: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  onCompleteChange: (isComplete: boolean) => void;
}> = ({
  services,
  schema,
  isLaunched,
  onLaunch,
  stackName,
  onStackNameChange,
  isOpen,
  onToggle,
  onCompleteChange,
}) => {
  const isComplete = isLaunched && stackName.trim().length > 0;

  useEffect(() => {
    onCompleteChange(isComplete);
  }, [isComplete, onCompleteChange]);

  // Design-preview-only toggle: the prototype has no real AWS backend to
  // actually fail, so this lets reviewers see the failure state on demand
  // without it ever appearing during a normal click-through.
  const [previewLaunchError, setPreviewLaunchError] = useState(false);

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
          Log collection via a single AWS CloudFormation stack — no agents required. Deploys the{' '}
          <strong>{AWS_SCHEMA_META[schema].label}</strong> template, per the data format chosen in
          Step 1. Trigger source (S3 or CloudWatch) is configured per service in Service settings.
          Launch CloudFormation to deploy.
        </p>
      </EuiText>
      <EuiSpacer size="m" />

      {!isLaunched ? (
        previewLaunchError ? (
          <KbnDangerCallout
            announceOnMount
            title="CloudFormation stack failed to deploy"
            data-test-subj="awsOnboardingCloudFormationLaunchError"
          >
            <p>
              This usually means the AWS account doesn&apos;t have permission to create IAM roles
              or Lambda functions, the &quot;I acknowledge that AWS CloudFormation might create
              IAM resources&quot; checkbox wasn&apos;t ticked, a stack with this name already
              exists, or the account has reached an AWS service limit (for example, the maximum
              number of Lambda functions).
            </p>
            <EuiFlexGroup gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButton
                  color="danger"
                  iconType="refresh"
                  onClick={() => setPreviewLaunchError(false)}
                  data-test-subj="awsOnboardingCloudFormationRetry"
                >
                  Retry
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  color="danger"
                  href="https://console.aws.amazon.com/cloudformation"
                  target="_blank"
                  iconType="popout"
                  iconSide="right"
                >
                  Open AWS CloudFormation console
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </KbnDangerCallout>
        ) : (
          <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                iconType="popout"
                iconSide="right"
                onClick={onLaunch}
                data-test-subj="awsOnboardingStep3LaunchCloudFormation"
              >
                Launch CloudFormation
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip content="Design preview only — shows how a failed deployment would look. Not part of the real flow.">
                <EuiButtonEmpty
                  size="xs"
                  color="text"
                  iconType="beaker"
                  onClick={() => setPreviewLaunchError(true)}
                  data-test-subj="awsOnboardingCloudFormationPreviewError"
                >
                  Preview error state
                </EuiButtonEmpty>
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
        )
      ) : (
        <EuiText size="s">
          <p>
            The Elastic Cloud Forwarder has been created in your AWS account. Data detection is
            running in the background — check Detect &amp; Review for arrival status.
          </p>
        </EuiText>
      )}

      {isLaunched && (
        <>
          <EuiSpacer size="l" />
          <EuiText size="s">
            <p>Copy the stack name from AWS Console and paste it below:</p>
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
        </>
      )}
    </AccordionCard>
  );
};

type ManagedAccessMethod = 'access_keys' | 'identity_federation';

// Managed Integrations widget — the single credentials card for the managed
// path (the separate "Setup access" card was removed as a duplicate).
// Defaults to Federated Identity; the Federated Identity Name is lifted to
// the parent flow so Detect & Review's summary can read it. Unlike earlier
// versions of this widget, it no longer waits for (or shows) per-service
// data arrival — that starts in the background on deploy but is only
// surfaced on Detect & Review (step 4), so deploying doesn't block progress
// here. Open/closed state is controlled by the parent's sequential
// accordion.
const ManagedIntegrationsWidget: React.FunctionComponent<{
  servicesCount: number;
  onValidityChange: (isValid: boolean) => void;
  identityName: string;
  onIdentityNameChange: (value: string) => void;
  isDeployed: boolean;
  onDeploy: () => void;
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

  const isComplete = isDeployed;

  useEffect(() => {
    onCompleteChange(isComplete);
  }, [isComplete, onCompleteChange]);

  // Design-preview-only toggle — see CloudFormationWidget above for why.
  const [previewDeployError, setPreviewDeployError] = useState(false);

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
          { id: 'identity_federation', label: 'Federated Identity' },
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
        previewDeployError ? (
          <KbnDangerCallout
            announceOnMount
            title="Couldn't verify AWS permissions for this role"
            data-test-subj="awsOnboardingManagedIntegrationsDeployError"
          >
            <p>
              AWS rejected the request to assume this role. This is usually because the
              role&apos;s trust policy doesn&apos;t allow Elastic to assume it, the Role ARN has a
              typo, or the account is missing the required permissions.
            </p>
            <EuiFlexGroup gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButton
                  color="danger"
                  iconType="refresh"
                  onClick={() => setPreviewDeployError(false)}
                  data-test-subj="awsOnboardingManagedIntegrationsRetry"
                >
                  Retry
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty color="danger" href="#" target="_blank" iconType="popout" iconSide="right">
                  Troubleshooting guide
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </KbnDangerCallout>
        ) : (
          <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                isDisabled={!isValid}
                onClick={onDeploy}
                data-test-subj="awsOnboardingDeployManagedIntegrations"
              >
                Deploy integrations
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip content="Design preview only — shows how a failed deployment would look. Not part of the real flow.">
                <EuiButtonEmpty
                  size="xs"
                  color="text"
                  iconType="beaker"
                  onClick={() => setPreviewDeployError(true)}
                  data-test-subj="awsOnboardingManagedIntegrationsPreviewError"
                >
                  Preview error state
                </EuiButtonEmpty>
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
        )
      ) : (
        <EuiText size="s">
          <p>
            Managed integrations deployed. Data detection is running in the background — check
            Detect &amp; Review for arrival status.
          </p>
        </EuiText>
      )}
    </AccordionCard>
  );
};

type HostMode = 'new_hosts' | 'existing_hosts';

// Agent path — "Where to add this integration?" card, mirroring Fleet's
// package-policy step (New Agent Policy / Existing Agent Policy converted
// from tabs to a radio choice, per the flow's one-or-the-other convention).
// Agent policy selection stays inline either way; only the actual install/
// enroll mechanics live behind the Add agent flyout, opened on demand —
// adding an agent is treated as a separate, deferrable action from picking
// where this integration goes. Enrollment in Fleet is the default (no
// standalone option). Open/closed state is controlled by the parent's
// sequential accordion.
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
  // The install/enroll mechanics live in the Add agent flyout, opened
  // on demand — agent policy selection stays inline either way, per the
  // team's guidance to keep policy selection + setup access inline and
  // only push the actual "how do I add an agent" steps into a flyout.
  const [isAddAgentFlyoutOpen, setIsAddAgentFlyoutOpen] = useState(false);
  const [existingPolicyIds, setExistingPolicyIds] = useState<string[]>([]);
  const [availablePolicies, setAvailablePolicies] = useState<string[]>([]);
  const [isCreatePolicyFlyoutOpen, setIsCreatePolicyFlyoutOpen] = useState(false);
  const [newPolicyName, setNewPolicyName] = useState('');
  const [platform, setPlatform] = useState('linux');
  const enrollTimer = useRef<number | null>(null);
  const servicesCount = services.length;
  const allReceived = servicesCount > 0 && receivedCount >= servicesCount;
  const isComplete = hostMode === 'new_hosts' && isEnrolled && allReceived;

  useEffect(() => {
    onCompleteChange(isComplete);
  }, [isComplete, onCompleteChange]);

  useEffect(() => {
    if (hostMode !== 'new_hosts') setIsAddAgentFlyoutOpen(false);
    if (hostMode !== 'existing_hosts') setIsCreatePolicyFlyoutOpen(false);
  }, [hostMode]);

  useEffect(() => {
    if (isEnrolled || hostMode !== 'new_hosts' || !isAddAgentFlyoutOpen) return;
    enrollTimer.current = window.setTimeout(onEnrolled, 8000);
    return () => {
      if (enrollTimer.current) window.clearTimeout(enrollTimer.current);
    };
  }, [isEnrolled, hostMode, isAddAgentFlyoutOpen, onEnrolled]);

  return (
    <>
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
          { id: 'new_hosts', label: 'New Agent Policy' },
          { id: 'existing_hosts', label: 'Existing Agent Policy' },
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
              A new Agent Policy is created for this integration. Add an Elastic Agent to a host
              to start collecting data — agents enroll in Fleet by default, so updates deploy
              automatically and agents are centrally managed.
            </p>
          </EuiText>
          <EuiSpacer size="m" />

          {!isEnrolled ? (
            <EuiButton
              fill
              iconType="plus"
              onClick={() => setIsAddAgentFlyoutOpen(true)}
              data-test-subj="awsOnboardingOpenAddAgentFlyout"
            >
              Add agent
            </EuiButton>
          ) : (
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon type="check" color="success" size="m" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s">1 agent enrolled</EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                {/* EuiButton, not EuiButtonEmpty — empty renders no visible
                    chrome at this size, so it read as a plain link rather
                    than a button. color="text" for a secondary (not
                    primary-blue) treatment. Standard (default) size, not
                    "xs" — matches "Add a new policy" below. */}
                <EuiButton
                  color="text"
                  iconType="plus"
                  onClick={() => setIsAddAgentFlyoutOpen(true)}
                  data-test-subj="awsOnboardingAddAnotherAgent"
                >
                  Add another agent
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          )}

          {isEnrolled && (
            <>
              <EuiSpacer size="m" />
              <EuiText size="s" color="subdued">
                {`${receivedCount} of ${servicesCount} - data received`}
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
        </>
      ) : (
        <>
          <EuiTitle size="xxs">
            <h4>Agent policies</h4>
          </EuiTitle>
          <EuiSpacer size="xs" />
          <EuiText size="s" color="subdued">
            <p>
              Select one or more existing Agent policies to add this integration to — it can be
              reused across many policies.
            </p>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiFormRow label="Agent policies" style={HALF_WIDTH} fullWidth>
            <EuiComboBox
              fullWidth
              placeholder={
                availablePolicies.length === 0
                  ? 'No agent policies available'
                  : 'Select agent policies'
              }
              options={availablePolicies.map((name) => ({ label: name }))}
              selectedOptions={existingPolicyIds.map((id) => ({ label: id }))}
              onChange={(selected) => setExistingPolicyIds(selected.map((o) => o.label))}
              isClearable
              aria-label="Select agent policies to add this integration to"
              data-test-subj="awsOnboardingExistingAgentPolicies"
            />
          </EuiFormRow>
          <EuiText size="xs" color="subdued">
            <p>
              {availablePolicies.length === 0
                ? "There aren't any options available."
                : "Don't see the policy you need?"}
            </p>
          </EuiText>
          <EuiSpacer size="m" />
          {/* A standalone button, not a link embedded in the sentence above
              — same "add/create something" action category as Add agent /
              Add another agent, styled the same way (bordered, text color,
              standard size) for consistency. */}
          <EuiButton
            color="text"
            iconType="plus"
            onClick={() => setIsCreatePolicyFlyoutOpen(true)}
            data-test-subj="awsOnboardingAddNewPolicy"
          >
            Add a new policy
          </EuiButton>
          <EuiSpacer size="m" />
          <EuiButton
            fill
            isDisabled={existingPolicyIds.length === 0}
            data-test-subj="awsOnboardingDeployExistingHosts"
          >
            Deploy hosts
          </EuiButton>
        </>
      )}
    </AccordionCard>

    {isAddAgentFlyoutOpen && (
      <EuiFlyout
        onClose={() => setIsAddAgentFlyoutOpen(false)}
        size="m"
        aria-label="Add agent"
        data-test-subj="awsOnboardingAddAgentFlyout"
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2>Add agent</h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiText size="s">
            <p>
              Select the appropriate platform and run commands to install, enroll, and start
              Elastic Agent. Reuse commands to set up agents on more than one host. All builds
              can be found on our{' '}
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
          <KbnWarningCallout announceOnMount title="Root privileges required">
            <p>
              This agent policy contains the following integrations that require Elastic Agents
              to have root privileges. To ensure that all data required by the integrations can
              be collected, enroll the agents using an account with root privileges. For more
              information, see the{' '}
              <EuiLink href="#" target="_blank" external>
                Fleet and Elastic Agent Guide
              </EuiLink>
            </p>
            <ul>
              <li>System</li>
            </ul>
          </KbnWarningCallout>
          <EuiSpacer size="m" />
          <EuiText size="s">
            <p>
              To install Elastic Agent without root privileges, add the{' '}
              <code>--unprivileged</code> flag to the <code>elastic-agent install</code> command
              below. For more information, see the{' '}
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
          <EuiSpacer size="l" />
          <EuiHorizontalRule margin="none" />
          <EuiSpacer size="m" />
          <EuiTitle size="xs">
            <h3>Confirm agent enrollment</h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiPanel hasBorder paddingSize="m" data-test-subj="awsOnboardingAgentEnrollmentTile">
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
          {!isEnrolled && (
            <>
              <EuiSpacer size="s" />
              <EuiText size="s" color="subdued">
                <p>
                  After the agent starts up, the Elastic Stack listens for the agent and confirms
                  the enrollment in Fleet. If you&apos;re having trouble connecting, check out the{' '}
                  <EuiLink href="#" target="_blank" external>
                    troubleshooting guide
                  </EuiLink>
                  .
                </p>
              </EuiText>
            </>
          )}
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="flexEnd" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                isDisabled={!isEnrolled}
                onClick={() => setIsAddAgentFlyoutOpen(false)}
                data-test-subj="awsOnboardingCloseAddAgentFlyout"
              >
                {isEnrolled ? 'Done' : 'Waiting for agent…'}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    )}

    {isCreatePolicyFlyoutOpen && (
      <EuiFlyout
        onClose={() => setIsCreatePolicyFlyoutOpen(false)}
        size="s"
        aria-label="Create agent policy"
        data-test-subj="awsOnboardingCreatePolicyFlyout"
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2>Create agent policy</h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiText size="s" color="subdued">
            <p>Agent policies are used to manage a group of integrations across a set of agents.</p>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiFormRow label="Name" fullWidth>
            <EuiFieldText
              fullWidth
              placeholder="e.g.: AWS policy"
              value={newPolicyName}
              onChange={(e) => setNewPolicyName(e.target.value)}
              aria-label="Agent policy name"
              data-test-subj="awsOnboardingNewPolicyName"
            />
          </EuiFormRow>
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={() => setIsCreatePolicyFlyoutOpen(false)}>
                Cancel
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                isDisabled={newPolicyName.trim().length === 0}
                onClick={() => {
                  const name = newPolicyName.trim();
                  setAvailablePolicies((prev) => [...prev, name]);
                  setExistingPolicyIds((prev) => [...prev, name]);
                  setNewPolicyName('');
                  setIsCreatePolicyFlyoutOpen(false);
                }}
                data-test-subj="awsOnboardingCreatePolicySubmit"
              >
                Create agent policy
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    )}
    </>
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
  schema: AwsSchema;
  deploymentMethod: DeploymentMethod;
  onDeploymentMethodChange: (method: DeploymentMethod) => void;
  onCredentialsValidChange: (isValid: boolean) => void;
  deployIdentityName: string;
  onDeployIdentityNameChange: (value: string) => void;
  isDeployed: boolean;
  onLaunchCloudFormation: () => void;
  stackName: string;
  onStackNameChange: (value: string) => void;
  isAgentEnrolled: boolean;
  onAgentEnrolled: () => void;
  isManagedDeployed: boolean;
  onDeployManagedIntegrations: () => void;
  agentReceivedCount: number;
}> = ({
  services,
  schema,
  deploymentMethod,
  onDeploymentMethodChange,
  onCredentialsValidChange,
  deployIdentityName,
  onDeployIdentityNameChange,
  isDeployed,
  onLaunchCloudFormation,
  stackName,
  onStackNameChange,
  isAgentEnrolled,
  onAgentEnrolled,
  isManagedDeployed,
  onDeployManagedIntegrations,
  agentReceivedCount,
}) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [pendingMethod, setPendingMethod] = useState<DeploymentMethod>(deploymentMethod);
  const [agentAccessKeyId, setAgentAccessKeyId] = useState('');
  const [agentSecretAccessKey, setAgentSecretAccessKey] = useState('');
  const [managedIntegrationsValid, setManagedIntegrationsValid] = useState(false);

  const servicesCount = services.length;

  // Sequential ("only one open at a time") accordions for the managed
  // path's card pair — the first card starts open, the second closed, and
  // completing the active card advances to the next after a short,
  // deliberate delay. The agent path only has one card left (Setup access's
  // fields moved into the Deployment method panel above), so it doesn't
  // need this pairing — it just manages its own open/closed state.
  const [isManagedIntegrationsComplete, setIsManagedIntegrationsComplete] = useState(false);
  const [isCloudFormationComplete, setIsCloudFormationComplete] = useState(false);
  const managedAccordion = useSequentialAccordion(
    ['managedIntegrations', 'cloudFormation'],
    [isManagedIntegrationsComplete, isCloudFormationComplete]
  );

  const [isWhereToAddOpen, setIsWhereToAddOpen] = useState(true);

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
            background: euiTheme.colors.backgroundBaseSubdued,
          }}
        >
          <EuiFlexGroup alignItems="flexStart" responsive={false}>
            {/* A couple of px nudge — flexStart aligns the icon to the very
                top of the line box, but the title's own leading pushes its
                visible glyphs down slightly, so the icon reads as sitting
                too high next to it without this. */}
            <EuiFlexItem grow={false} style={{ paddingTop: 2 }}>
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

        {/* Setup access's fields live here directly for the agent path now
            — with only "Where to add this integration?" left below, a
            separate Setup access card was redundant. */}
        {deploymentMethod === 'agent' && (
          <>
            <EuiSpacer size="xxl" />
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
          </>
        )}
      </EuiPanel>

      {deploymentMethod === 'agent' ? (
        <>
          <EuiSpacer size="l" />
          <WhereToAddCard
            services={services}
            isEnrolled={isAgentEnrolled}
            onEnrolled={onAgentEnrolled}
            receivedCount={agentReceivedCount}
            isOpen={isWhereToAddOpen}
            onToggle={() => setIsWhereToAddOpen((v) => !v)}
            onCompleteChange={() => {}}
          />
        </>
      ) : (
        <>
          <EuiHorizontalRule margin="l" />
          <ManagedIntegrationsWidget
            servicesCount={servicesCount}
            onValidityChange={setManagedIntegrationsValid}
            identityName={deployIdentityName}
            onIdentityNameChange={onDeployIdentityNameChange}
            isDeployed={isManagedDeployed}
            onDeploy={onDeployManagedIntegrations}
            isOpen={managedAccordion.isOpen('managedIntegrations')}
            onToggle={() => managedAccordion.toggle('managedIntegrations')}
            onCompleteChange={setIsManagedIntegrationsComplete}
          />
          <EuiSpacer size="m" />
          <CloudFormationWidget
            services={services}
            schema={schema}
            isLaunched={isDeployed}
            onLaunch={onLaunchCloudFormation}
            stackName={stackName}
            onStackNameChange={onStackNameChange}
            isOpen={managedAccordion.isOpen('cloudFormation')}
            onToggle={() => managedAccordion.toggle('cloudFormation')}
            onCompleteChange={setIsCloudFormationComplete}
          />
        </>
      )}

      {isEditModalOpen && (
        <EuiModal
          onClose={() => setIsEditModalOpen(false)}
          aria-label="Edit deployment method"
          data-test-subj="awsOnboardingDeploymentMethodModal"
          style={{ width: euiTheme.breakpoint.s }}
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
