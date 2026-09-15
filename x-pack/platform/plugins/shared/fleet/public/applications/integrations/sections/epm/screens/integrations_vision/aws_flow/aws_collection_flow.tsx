/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * AwsCollectionFlow — reference wizard shell for the AWS bundle install flow.
 *
 * Draft / not-for-merge: composes the ported step components so reviewers can
 * read the flow end to end. Steps:
 *
 *   1. Schema & Services — data schema + bundle member selection   [SPECIFIED]
 *   2. Settings          — per-service inline settings grid        [SPECIFIED]
 *   3. Authenticate & Deploy                                       [TBA]
 *   4. Summary                                                     [TBA]
 *
 * Steps 3–4 are intentionally placeholders: design drafts are in progress;
 * engineering scope is tracked in the step sub-issues (see PR description).
 *
 * Interactive reference: https://scaling-chainsaw-nyj68ke.pages.github.io/
 * (Elastic SSO) → New Onboarding → AWS tile.
 */

import React, { useRef, useState } from 'react';
import { EuiButton, EuiButtonEmpty, EuiIcon, EuiPanel, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

import { DataSchemaSection, type SchemaId } from './data_schema_section';
import { SelectServicesSection } from './select_services_section';
import { AwsSettingsSection } from './aws_settings_section';
import { StepSections } from './step_primitives';
import { AWS_SERVICES } from './aws_services';

type StepId = 'schema-services' | 'settings' | 'auth-deploy' | 'summary';

const STEPS: ReadonlyArray<{ id: StepId; label: string; tba?: boolean }> = [
  { id: 'schema-services', label: 'Schema & Services' },
  { id: 'settings', label: 'Settings' },
  { id: 'auth-deploy', label: 'Authenticate & Deploy', tba: true },
  { id: 'summary', label: 'Summary', tba: true },
];

const TbaPlaceholder = ({ label }: { label: string }): React.ReactElement => (
  <EuiPanel hasShadow={false} hasBorder={true} paddingSize="l">
    <EuiText size="s" color="subdued">
      <p>
        <strong>{label}</strong> — TBA. Design drafts in progress; engineering scope is tracked in
        the step sub-issues (see PR description).
      </p>
    </EuiText>
  </EuiPanel>
);

export const AwsCollectionFlow = (): React.ReactElement => {
  const { euiTheme } = useEuiTheme();

  const [currentStep, setCurrentStep] = useState(0);
  const [schema, setSchema] = useState<SchemaId>('otel');
  const [selectedServices, setSelectedServices] = useState<ReadonlyArray<string>>([]);
  const [settingsCanProceed, setSettingsCanProceed] = useState(true);
  // The settings step exposes its validate-and-advance handler; the shared
  // footer calls it so validation errors surface on Next.
  const settingsHandleNextRef = useRef<(() => void) | null>(null);

  const activeStep = STEPS[currentStep];
  const goBack = (): void => setCurrentStep((s) => Math.max(0, s - 1));
  const goNext = (): void => setCurrentStep((s) => Math.min(STEPS.length - 1, s + 1));

  const renderContent = (): React.ReactNode => {
    switch (activeStep.id) {
      case 'schema-services':
        return (
          <StepSections>
            <DataSchemaSection availability="both" value={schema} onChange={setSchema} />
            <SelectServicesSection
              bundleTitle="AWS"
              services={AWS_SERVICES}
              selected={selectedServices}
              onSelectionChange={setSelectedServices}
            />
          </StepSections>
        );
      case 'settings':
        return (
          <AwsSettingsSection
            selectedServiceIds={selectedServices}
            allServices={AWS_SERVICES}
            onNext={goNext}
            onNextReady={(fn) => {
              settingsHandleNextRef.current = fn;
            }}
            onCanProceedChange={setSettingsCanProceed}
          />
        );
      default:
        return <TbaPlaceholder label={activeStep.label} />;
    }
  };

  return (
    <div
      css={css`
        display: flex;
        gap: ${euiTheme.size.base};
        align-items: stretch;
      `}
    >
      {/* Step rail — text-first: 2px accent bar, all-caps labels (workbench 09-15) */}
      <nav
        aria-label="Setup steps"
        css={css`
          width: 200px;
          flex-shrink: 0;
          padding: ${euiTheme.size.base} 0;
          display: flex;
          flex-direction: column;
          gap: ${euiTheme.size.xs};
        `}
      >
        {STEPS.map((step, index) => {
          const isCurrent = index === currentStep;
          const isComplete = index < currentStep;
          const railColor = isComplete
            ? euiTheme.colors.borderBaseSuccess
            : isCurrent
            ? euiTheme.colors.primary
            : euiTheme.colors.borderBaseSubdued;
          return (
            <div
              key={step.id}
              aria-current={isCurrent ? 'step' : undefined}
              css={css`
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: ${euiTheme.size.s};
                padding: 6px ${euiTheme.size.m};
                border-inline-start: 2px solid ${railColor};
                font-size: 11px;
                font-weight: ${euiTheme.font.weight.semiBold};
                line-height: 16px;
                letter-spacing: 0.06em;
                text-transform: uppercase;
                color: ${isCurrent ? euiTheme.colors.textHeading : euiTheme.colors.textSubdued};
              `}
            >
              <span>
                {step.label}
                {step.tba === true ? ' *' : ''}
              </span>
              {isComplete && <EuiIcon type="check" size="s" color="success" />}
            </div>
          );
        })}
      </nav>

      {/* Content + footer */}
      <div
        css={css`
          flex: 1 1 0;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: ${euiTheme.size.base};
          border: 1px solid ${euiTheme.colors.borderBaseSubdued};
          border-radius: ${euiTheme.border.radius.small};
          padding: ${euiTheme.size.base};
        `}
      >
        <div
          css={css`
            flex: 1 1 auto;
          `}
        >
          {renderContent()}
        </div>
        <div
          css={css`
            display: flex;
            justify-content: space-between;
            align-items: center;
          `}
        >
          {currentStep > 0 ? (
            <EuiButtonEmpty size="s" onClick={goBack}>
              Back
            </EuiButtonEmpty>
          ) : (
            <span />
          )}
          {currentStep < STEPS.length - 1 && (
            <EuiButton
              fill
              size="s"
              isDisabled={activeStep.id === 'settings' && !settingsCanProceed}
              onClick={() => {
                if (activeStep.id === 'settings' && settingsHandleNextRef.current !== null) {
                  settingsHandleNextRef.current();
                  return;
                }
                goNext();
              }}
            >
              {currentStep === 0 ? "Let's go" : 'Next'}
            </EuiButton>
          )}
        </div>
      </div>
    </div>
  );
};
