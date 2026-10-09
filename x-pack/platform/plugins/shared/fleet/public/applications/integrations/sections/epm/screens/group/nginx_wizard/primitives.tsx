/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// PROTOTYPE: layout primitives for the Nginx onboarding wizard, modeled on the design team's
// Ingest Workbench prototype (elastic/ingest-workbench-preview). Not production components.
//
// Visual rules: white surfaces with hairline borders. Selection is a primary border plus a faint
// wash. The only tinted surface is the shared "Global settings" block.

import React, { useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiIconTip,
  EuiRadio,
  EuiText,
  EuiTitle,
  euiCanAnimate,
  transparentize,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';

import type { NginxStep } from './model';
import { STEP_LABELS } from './model';

export const SectionHeading: React.FC<{
  title: string;
  description?: React.ReactNode;
  info?: string;
}> = ({ title, description, info }) => (
  <div>
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiTitle size="xxs">
          <h3>{title}</h3>
        </EuiTitle>
      </EuiFlexItem>
      {info && (
        <EuiFlexItem grow={false}>
          <EuiIconTip content={info} type="info" color="subdued" size="s" />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
    {description && (
      <EuiText size="xs" color="subdued" css={css({ marginTop: 4 })}>
        {description}
      </EuiText>
    )}
  </div>
);

/** Selectable card: primary border + faint wash when checked, white otherwise. */
export const ChoiceCard: React.FC<{
  control: 'radio' | 'checkbox';
  name?: string;
  title: string;
  description: React.ReactNode;
  checked: boolean;
  onChange: () => void;
  badge?: string;
  disabled?: boolean;
  children?: React.ReactNode;
  'data-test-subj'?: string;
}> = ({
  control,
  name,
  title,
  description,
  checked,
  onChange,
  badge,
  disabled,
  children,
  ...rest
}) => {
  const { euiTheme } = useEuiTheme();
  const id = useGeneratedHtmlId();
  return (
    <div
      data-test-subj={rest['data-test-subj']}
      css={css({
        display: 'flex',
        gap: euiTheme.size.m,
        height: '100%',
        padding: `${euiTheme.size.m} ${euiTheme.size.base}`,
        borderRadius: euiTheme.border.radius.panel,
        border: `1px solid ${
          checked ? euiTheme.colors.borderBasePrimary : euiTheme.colors.borderBasePlain
        }`,
        background: checked
          ? transparentize(euiTheme.colors.primary, 0.04)
          : euiTheme.colors.backgroundBasePlain,
        opacity: disabled ? 0.6 : 1,
        transition: 'border-color 120ms ease, background 120ms ease',
        '&:hover': disabled
          ? undefined
          : { borderColor: checked ? undefined : euiTheme.colors.borderBaseProminent },
      })}
    >
      <div css={css({ paddingTop: 1 })}>
        {control === 'radio' ? (
          <EuiRadio id={id} name={name} checked={checked} onChange={onChange} disabled={disabled} />
        ) : (
          <EuiCheckbox id={id} checked={checked} onChange={onChange} disabled={disabled} />
        )}
      </div>
      <div css={css({ flex: 1 })}>
        <label htmlFor={id} css={css({ cursor: disabled ? 'default' : 'pointer' })}>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <strong>{title}</strong>
              </EuiText>
            </EuiFlexItem>
            {badge && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">{badge}</EuiBadge>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
          <EuiText size="xs" color="subdued" css={css({ marginTop: 2 })}>
            {description}
          </EuiText>
        </label>
        {children}
      </div>
    </div>
  );
};

/** Vertical step rail on the left of the wizard. */
export const StepRail: React.FC<{
  steps: NginxStep[];
  current: NginxStep;
  completed: (step: NginxStep) => boolean;
  canSelect: (step: NginxStep) => boolean;
  onSelect: (step: NginxStep) => void;
}> = ({ steps, current, completed, canSelect, onSelect }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <nav aria-label="Setup steps" css={css({ width: 180, flexShrink: 0 })}>
      {steps.map((step) => {
        const isCurrent = step === current;
        const isDone = !isCurrent && completed(step);
        const selectable = !isCurrent && canSelect(step);
        return (
          <button
            key={step}
            type="button"
            disabled={!selectable}
            aria-current={isCurrent ? 'step' : undefined}
            onClick={() => onSelect(step)}
            data-test-subj={`nginxWizardRail-${step}`}
            css={css({
              display: 'flex',
              alignItems: 'center',
              gap: euiTheme.size.s,
              width: '100%',
              textAlign: 'left',
              padding: `${euiTheme.size.s} ${euiTheme.size.m}`,
              borderLeft: `2px solid ${
                isCurrent
                  ? euiTheme.colors.borderBasePrimary
                  : isDone
                  ? euiTheme.colors.borderBaseSuccess
                  : euiTheme.colors.borderBaseSubdued
              }`,
              fontSize: 12,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              fontWeight: isCurrent ? euiTheme.font.weight.semiBold : euiTheme.font.weight.regular,
              color: isCurrent ? euiTheme.colors.textParagraph : euiTheme.colors.textSubdued,
              cursor: selectable ? 'pointer' : 'default',
              background: 'none',
              '&:hover': selectable ? { color: euiTheme.colors.textPrimary } : undefined,
            })}
          >
            <span css={css({ flex: 1 })}>{STEP_LABELS[step]}</span>
            {isDone && <EuiIcon type="check" color="success" size="s" aria-hidden={true} />}
          </button>
        );
      })}
    </nav>
  );
};

const DURATION = 240;
const EASING = 'cubic-bezier(0.4, 0, 0.2, 1)';

/** Chevron that rotates 90deg when open. */
export const Chevron: React.FC<{ isOpen: boolean; size?: 's' | 'm' }> = ({
  isOpen,
  size = 's',
}) => (
  <EuiIcon
    type="chevronSingleRight"
    size={size}
    aria-hidden={true}
    css={css({
      transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
      [euiCanAnimate]: { transition: `transform ${DURATION}ms ${EASING}` },
    })}
  />
);

/**
 * Animated expand/collapse (height + fade) using the grid-rows trick, so no measuring. Closed
 * content is `visibility: hidden` once the transition ends, which keeps it out of the tab order.
 */
export const Reveal: React.FC<{ isOpen: boolean; children: React.ReactNode }> = ({
  isOpen,
  children,
}) => {
  // Mount on first open, then keep mounted so collapsing can animate.
  const [hasOpened, setHasOpened] = useState(isOpen);
  if (isOpen && !hasOpened) setHasOpened(true);
  return (
    <div
      aria-hidden={!isOpen}
      css={css({
        display: 'grid',
        gridTemplateRows: isOpen ? '1fr' : '0fr',
        opacity: isOpen ? 1 : 0,
        visibility: isOpen ? 'visible' : 'hidden',
        [euiCanAnimate]: {
          transition: isOpen
            ? `grid-template-rows ${DURATION}ms ${EASING}, opacity ${DURATION}ms ease`
            : `grid-template-rows ${DURATION}ms ${EASING}, opacity ${DURATION}ms ease, visibility 0s ${DURATION}ms`,
        },
      })}
    >
      <div css={css({ overflow: 'hidden', minHeight: 0 })}>{hasOpened && children}</div>
    </div>
  );
};

/** Tinted block for settings that apply to every stream of a signal. */
export const SharedSettingsCard: React.FC<{
  title: string;
  description: string;
  advanced?: React.ReactNode;
  children?: React.ReactNode;
}> = ({ title, description, advanced, children }) => {
  const { euiTheme } = useEuiTheme();
  const [showAdvanced, setShowAdvanced] = useState(false);
  return (
    <div
      css={css({
        padding: `${euiTheme.size.base} ${euiTheme.size.l}`,
        borderRadius: euiTheme.border.radius.panel,
        background: euiTheme.colors.backgroundBaseSubdued,
      })}
    >
      <EuiFlexGroup alignItems="center" responsive={false}>
        <EuiFlexItem>
          <SectionHeading title={title} description={description} />
        </EuiFlexItem>
        {advanced && (
          <EuiFlexItem grow={false}>
            <AdvancedToggle isOpen={showAdvanced} onToggle={() => setShowAdvanced(!showAdvanced)} />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      {children && <div css={css({ marginTop: euiTheme.size.base })}>{children}</div>}
      {advanced && (
        <Reveal isOpen={showAdvanced}>
          <div css={css({ paddingTop: euiTheme.size.base })}>{advanced}</div>
        </Reveal>
      )}
    </div>
  );
};

/** Small bordered pill that reveals advanced fields. */
export const AdvancedToggle: React.FC<{ isOpen: boolean; onToggle: () => void }> = ({
  isOpen,
  onToggle,
}) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiButtonEmpty
      size="xs"
      color="text"
      aria-expanded={isOpen}
      onClick={(e: React.MouseEvent) => {
        e.stopPropagation();
        onToggle();
      }}
      css={css({
        border: `1px solid ${
          isOpen ? euiTheme.colors.borderBaseProminent : euiTheme.colors.borderBasePlain
        }`,
        borderRadius: 999,
        background: euiTheme.colors.backgroundBasePlain,
      })}
    >
      <span css={css({ display: 'inline-flex', alignItems: 'center', gap: 4 })}>
        <EuiIcon type="gear" size="s" aria-hidden={true} />
        Advanced options
        <Chevron isOpen={isOpen} />
      </span>
    </EuiButtonEmpty>
  );
};

/** Collapsible row per data stream. Starts collapsed. Streams are picked on step 1. */
export const StreamCard: React.FC<{
  title: string;
  description: string;
  advanced?: React.ReactNode;
  children: React.ReactNode;
  'data-test-subj'?: string;
}> = ({ title, description, advanced, children, ...rest }) => {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  return (
    <div
      data-test-subj={rest['data-test-subj']}
      css={css({
        borderRadius: euiTheme.border.radius.panel,
        border: `1px solid ${euiTheme.colors.borderBasePlain}`,
        background: euiTheme.colors.backgroundBasePlain,
        [euiCanAnimate]: { transition: `border-color ${DURATION}ms ease` },
        '&:hover': { borderColor: euiTheme.colors.borderBaseProminent },
      })}
    >
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
        css={css({
          display: 'flex',
          alignItems: 'center',
          gap: euiTheme.size.m,
          padding: `${euiTheme.size.m} ${euiTheme.size.base}`,
          cursor: 'pointer',
        })}
      >
        <Chevron isOpen={isOpen} size="m" />
        <EuiIcon type="logoNginx" size="m" aria-hidden={true} />
        <div css={css({ flex: 1 })}>
          <EuiText size="s">
            <strong>{title}</strong>
          </EuiText>
          <EuiText size="xs" color="subdued">
            {description}
          </EuiText>
        </div>
        {advanced && (
          <div
            css={css({
              opacity: isOpen ? 1 : 0,
              pointerEvents: isOpen ? 'auto' : 'none',
              [euiCanAnimate]: { transition: `opacity ${DURATION}ms ease` },
            })}
          >
            <AdvancedToggle isOpen={showAdvanced} onToggle={() => setShowAdvanced(!showAdvanced)} />
          </div>
        )}
      </div>
      <Reveal isOpen={isOpen}>
        <div
          css={css({
            padding: `${euiTheme.size.base} ${euiTheme.size.base} ${euiTheme.size.l}`,
            borderTop: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
          })}
        >
          {children}
          {advanced && (
            <Reveal isOpen={showAdvanced}>
              <div css={css({ paddingTop: euiTheme.size.base })}>{advanced}</div>
            </Reveal>
          )}
        </div>
      </Reveal>
    </div>
  );
};
