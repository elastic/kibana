/**
 * AwsSettingsSection — Step 2 of the AWS bundle wizard.
 *
 * Shows the services the user selected in Step 1, grouped into an accordion
 * list (one open at a time). Each service exposes:
 *   - Signals (which to collect)
 *   - AWS region (overrides the global default)
 *   - Authentication method (S3 | CloudWatch when both available)
 *   - S3 bucket ARN (required when S3 is selected)
 *
 * Animations (her call: slow, delicate, elegant):
 *   - Accordion open/close: 320ms cubic-bezier ease (height), 240ms opacity
 *   - Check icon appearing in ARN field: spring pop (350ms)
 *   - Warning icon disappearing when service resolves: 300ms fade-out
 *
 * Figma: 3281-121639 (default), 3281-126198 (expanded+valid),
 *        3281-122259 (multiple warnings), 3281-124263 (expanded+error),
 *        3281-127333 (all complete)
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFieldText,
  EuiIcon,
  EuiPopover,
  EuiSelect,
  EuiSuperSelect,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css, keyframes } from '@emotion/react';
import { StepSectionHeading } from './step_primitives';
import type { Signal } from './signals_section';
import type { BundleService, AuthMethod } from './aws_services';

// ─── AWS regions list ────────────────────────────────────────────────────────

const AWS_REGIONS = [
  'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
  'ap-south-1', 'ap-northeast-1', 'ap-northeast-2', 'ap-southeast-1', 'ap-southeast-2',
  'eu-central-1', 'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-north-1',
  'sa-east-1', 'ca-central-1', 'me-south-1',
] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

interface ServiceConfig {
  signals: ReadonlyArray<Signal>;
  region: string; // '' = use global
  authMethod: AuthMethod;
  s3Arn: string;
  s3ArnTouched: boolean;
}

// ─── Keyframes ───────────────────────────────────────────────────────────────

/**
 * One configurable row = one instance. Originals key on the service id;
 * duplicates get a generated key + editable name (09-15 duplicate action).
 */
interface ServiceInstance {
  key: string;
  serviceId: string;
  name?: string;
  isDuplicate: boolean;
}

const cardEnter = keyframes`
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
`;

/* Full life of the ARN confirmation check (09-15): subtle fade-in,
   hold long enough to register, quiet fade-out. The component unmounts
   on animationend — the check is a moment of feedback, not a permanent badge. */
const checkLife = keyframes`
  0%   { opacity: 0; transform: translateY(-50%) scale(0.9); }
  12%  { opacity: 1; transform: translateY(-50%) scale(1); }
  75%  { opacity: 1; transform: translateY(-50%) scale(1); }
  100% { opacity: 0; transform: translateY(-50%) scale(1); }
`;

/* Draws the check stroke from invisible to fully drawn */
const drawCheck = keyframes`
  0%   { stroke-dashoffset: 14; }
  100% { stroke-dashoffset: 0; }
`;

const warnFadeOut = keyframes`
  0%   { opacity: 1; transform: scale(1); }
  100% { opacity: 0; transform: scale(0.7); }
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const isServiceValid = (config: ServiceConfig): boolean => {
  if (config.authMethod === 'S3') return config.s3Arn.trim() !== '';
  return true;
};

const initConfig = (service: BundleService): ServiceConfig => ({
  signals: [...service.signals],
  region: '',
  authMethod: service.defaultAuth,
  s3Arn: '',
  s3ArnTouched: false,
});

// ─── Animated accordion content ───────────────────────────────────────────────

const AccordionContent = ({
  isOpen,
  children,
}: {
  isOpen: boolean;
  children: React.ReactNode;
}): React.ReactElement => {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (!ref.current) return;
    if (isOpen) {
      // Use scrollHeight to get the natural height, then animate to it
      setHeight(ref.current.scrollHeight);
    } else {
      // Snapshot current height before collapsing for smooth animation
      setHeight(ref.current.scrollHeight);
      requestAnimationFrame(() => setHeight(0));
    }
  }, [isOpen]);

  // Re-measure if content changes while open
  useEffect(() => {
    if (isOpen && ref.current) {
      setHeight(ref.current.scrollHeight);
    }
  });

  return (
    <div
      css={css`
        overflow: hidden;
        height: ${height}px;
        transition: height 320ms cubic-bezier(0.4, 0, 0.2, 1),
                    opacity 240ms ease;
        opacity: ${isOpen ? 1 : 0};
        will-change: height, opacity;
      `}
    >
      <div ref={ref}>
        {children}
      </div>
    </div>
  );
};

// ─── Single service row ───────────────────────────────────────────────────────

const ServiceRow = ({
  service,
  config,
  isExpanded,
  globalRegion,
  onToggle,
  onConfigChange,
  displayName,
  isDuplicate,
  justAdded,
  onDuplicate,
  onRemove,
  onRename,
}: {
  service: BundleService;
  config: ServiceConfig;
  isExpanded: boolean;
  globalRegion: string;
  onToggle: () => void;
  onConfigChange: (patch: Partial<ServiceConfig>) => void;
  displayName: string;
  isDuplicate: boolean;
  justAdded: boolean;
  onDuplicate: () => void;
  onRemove?: () => void;
  onRename?: (name: string) => void;
}): React.ReactElement => {
  const { euiTheme } = useEuiTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const isValid = isServiceValid(config);
  const hasOverrideRegion = config.region !== '' && config.region !== globalRegion;
  // Error shows IMMEDIATELY when the card opens (09-15): the empty required
  // field is the one thing the user must act on — don't wait for touch/blur.
  const showArnError = config.authMethod === 'S3' && config.s3Arn.trim() === '';
  const arnFilled = config.authMethod === 'S3' && config.s3Arn.trim() !== '';

  // Transient confirmation check (09-15): appears on the empty → filled
  // transition, draws, holds, fades — then unmounts. Removal is driven by a
  // timer (not animationend: hidden/throttled tabs pause CSS animations and
  // the event never fires, leaving the check stuck).
  const prevArnFilled = useRef(arnFilled);
  const [arnCheckVisible, setArnCheckVisible] = useState(false);
  useEffect(() => {
    if (!prevArnFilled.current && arnFilled) {
      setArnCheckVisible(true);
      prevArnFilled.current = arnFilled;
      const t = setTimeout(() => setArnCheckVisible(false), 1900);
      return () => clearTimeout(t);
    }
    if (!arnFilled) setArnCheckVisible(false);
    prevArnFilled.current = arnFilled;
  }, [arnFilled]);

  // Track when service transitions from invalid → valid for warning fade-out
  const prevValid = useRef(isValid);
  const [justResolved, setJustResolved] = useState(false);
  useEffect(() => {
    if (!prevValid.current && isValid) {
      setJustResolved(true);
      const t = setTimeout(() => setJustResolved(false), 350);
      return () => clearTimeout(t);
    }
    prevValid.current = isValid;
  }, [isValid]);

  const [regionResetting, setRegionResetting] = useState(false);

  const handleResetRegion = (): void => {
    setRegionResetting(true);
    onConfigChange({ region: '' });
    setTimeout(() => setRegionResetting(false), 450);
  };

  const toggleSignal = (signal: Signal): void => {
    const next = config.signals.includes(signal)
      ? config.signals.filter((s) => s !== signal)
      : [...config.signals, signal];
    if (next.length > 0) onConfigChange({ signals: next });
  };

  const rowBg = isExpanded
    ? euiTheme.colors.backgroundBaseSubdued
    : 'transparent';

  // Priority: invalid (orange) > default. Resting border: subdued — the 09-15 am
  // accessibility bump to plain was reverted same day pm (her call: delicate styling).
  const borderColor = !isValid
    ? euiTheme.colors.textWarning
    : euiTheme.colors.borderBaseSubdued;

  return (
    <div
      css={css`
        border: 1px solid ${borderColor};
        border-radius: ${euiTheme.border.radius.medium};
        overflow: hidden;
        transition: border-color 250ms ease;
        background: ${euiTheme.colors.backgroundBasePlain};
        animation: ${justAdded ? css`${cardEnter} 260ms ease both` : 'none'};
      `}
    >
      {/* ── Row header — flex row: toggle button + badges + ⋯ menu as SIBLINGS
           (a <button> can't nest interactive children). Hover on the row
           reveals the ⋯; badges still toggle on click. ── */}
      <div
        className="svcRowHeader"
        css={css`
          display: flex;
          align-items: center;
          gap: ${euiTheme.size.s};
          padding: ${euiTheme.size.s} ${euiTheme.size.m};
          background: ${rowBg};
          transition: background 250ms ease;

          &:hover {
            background: ${euiTheme.colors.backgroundBaseSubdued};
          }
        `}
      >
      <button
        type="button"
        onClick={onToggle}
        css={css`
          flex: 1 1 auto;
          min-width: 0;
          display: flex;
          align-items: center;
          gap: ${euiTheme.size.s};
          padding: 0;
          background: transparent;
          border: none;
          cursor: pointer;
          text-align: left;
        `}
      >
        {/* Chevron — inline SVG avoids EUI 119 icon-name uncertainty (arrowDown/Right absent) */}
        <span
          aria-hidden="true"
          css={css`
            display: inline-flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            color: ${euiTheme.colors.textSubdued};
            transition: transform 320ms ease;
            transform: ${isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)'};
          `}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path
              d="M1.5 3.5L5 7L8.5 3.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>

        {/* Warning icon — always in DOM so layout never shifts; opacity drives visibility.
            Tooltip explains WHAT is missing (09-15: user couldn't tell what to fill in). */}
        <EuiToolTip
          content={!isValid ? 'S3 bucket ARN is required — open the card and fill it in to continue.' : undefined}
          position="top"
        >
          <EuiIcon
            type="warning"
            color="warning"
            size="s"
            tabIndex={!isValid ? 0 : -1}
            css={css`
              flex-shrink: 0;
              opacity: ${!isValid ? 1 : 0};
              pointer-events: ${!isValid ? 'auto' : 'none'};
              animation: ${justResolved ? css`${warnFadeOut} 300ms ease forwards` : 'none'};
              transition: ${justResolved ? 'none' : 'opacity 300ms ease'};
            `}
          />
        </EuiToolTip>

        {/* Service icon */}
        {/* Reference port: EUI AWS logo instead of the workbench's per-service
            SVGs (service.iconSrc). Production should use EPR icons (PackageIcon). */}
        <EuiIcon type="logoAWS" size="m" css={css`flex-shrink: 0;`} />

        {/* Title — instance name for duplicates, service title otherwise */}
        <span
          css={css`
            flex: 1 1 auto;
            min-width: 0;
            font-size: 14px;
            font-weight: ${euiTheme.font.weight.medium};
            color: ${euiTheme.colors.textParagraph};
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          `}
        >
          {displayName}
        </span>
      </button>

      {/* Badge group — sibling of the toggle button; still toggles on click */}
      <div
        onClick={onToggle}
        css={css`display: flex; align-items: center; gap: 4px; flex-shrink: 0; cursor: pointer;`}
      >
        {/* Auth method — "text" colour per Figma */}
        <EuiBadge
          color="default"
          css={css`font-size: 11px;`}
        >
          {config.authMethod}
        </EuiBadge>

        {/* Signals — hollow per Figma */}
        {service.signals.map((sig) => (
          <EuiBadge
            key={sig}
            color={config.signals.includes(sig) ? 'hollow' : 'default'}
            css={css`
              font-size: 11px;
              opacity: ${config.signals.includes(sig) ? 1 : 0.4};
            `}
          >
            {sig}
          </EuiBadge>
        ))}
      </div>

      {/* Vertical-ellipsis actions — STATIC (09-15: hover-reveal shifted the
          badges and left an empty gap; a quiet always-there icon is calmer). */}
      <EuiPopover
        isOpen={menuOpen}
        closePopover={() => setMenuOpen(false)}
        panelPaddingSize="none"
        anchorPosition="downRight"
        button={
          <EuiButtonIcon
            iconType="boxesVertical"
            color="text"
            size="xs"
            aria-label={`Actions for ${displayName}`}
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
          />
        }
      >
        <EuiContextMenuPanel
          items={[
            <EuiContextMenuItem
              key="duplicate"
              icon="copy"
              onClick={() => {
                setMenuOpen(false);
                onDuplicate();
              }}
            >
              Duplicate
            </EuiContextMenuItem>,
            ...(isDuplicate && onRemove
              ? [
                  <EuiContextMenuItem
                    key="remove"
                    icon="trash"
                    css={css`color: ${euiTheme.colors.textDanger};`}
                    onClick={() => {
                      setMenuOpen(false);
                      onRemove();
                    }}
                  >
                    Remove
                  </EuiContextMenuItem>,
                ]
              : []),
          ]}
        />
      </EuiPopover>
      </div>{/* end row header */}

      {/* ── Expanded content ─────────────────────────────────────────────────── */}
      <AccordionContent isOpen={isExpanded}>
        <div
          css={css`
            padding: ${euiTheme.size.base};
            border-top: 1px solid ${euiTheme.colors.borderBaseSubdued};
            /* Compact 2-col grid (09-15 pm, her call: "takes so much vertical space").
               Was a single stacked column with 24px gaps — now paired rows:
               Signals | Auth method, then AWS region | S3 ARN. 16px row rhythm,
               8px gutter (the master-grid gutter), 4px label→control. */
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: ${euiTheme.size.base} ${euiTheme.size.s};
            align-items: start;
            background: ${euiTheme.colors.backgroundBasePlain}; /* 09-15: white — cleaner against blue checkboxes + amber warning */
          `}
        >
          {/* Instance name — duplicates only; originals stay noise-free (09-15).
              Width = signals grid column edge: one vertical line through the card. */}
          {isDuplicate && onRename !== undefined && (
            <div css={css`grid-column: 1 / -1; display: flex; flex-direction: column; gap: ${euiTheme.size.xs}; max-width: calc(50% - 4px);`}>
              <label css={css`font-size: 12.25px; font-weight: ${euiTheme.font.weight.semiBold}; color: ${euiTheme.colors.textHeading};`}>
                Instance name
              </label>
              <EuiFieldText
                compressed
                fullWidth /* fills the shared 50% column cap — same edge as region/ARN (09-15) */
                value={displayName}
                onChange={(e) => onRename(e.target.value)}
                aria-label="Instance name"
              />
            </div>
          )}

          {/* Signals — RIGHT cell of row 1 (09-15 pm v3, her call: region left,
              signals right). Swapped via grid order to keep source diff small. */}
          <div
            css={css`
              order: 2;
              display: flex;
              flex-direction: column;
              gap: ${euiTheme.size.xs};
            `}
          >
            <span
              css={css`
                font-size: 12.25px;
                font-weight: ${euiTheme.font.weight.semiBold};
                color: ${euiTheme.colors.textHeading};
              `}
            >
              Signals
            </span>
            {/* Single option → non-interactive badge (Figma 3281-133547) */}
            {service.signals.length === 1 ? (
              <div>
                <EuiBadge color="hollow">{service.signals[0]}</EuiBadge>
              </div>
            ) : (
              <div
                css={css`
                  display: grid;
                  grid-template-columns: repeat(2, 1fr);
                  gap: ${euiTheme.size.s};
                `}
              >
                {service.signals.map((signal) => {
                  const checked = config.signals.includes(signal);
                  return (
                    <button
                      key={signal}
                      type="button"
                      onClick={() => toggleSignal(signal)}
                      css={css`
                        display: flex;
                        align-items: center;
                        gap: ${euiTheme.size.s};
                        padding: 6px ${euiTheme.size.m}; /* 09-15 pm: was 8px 12px — compact grid */
                        /* 09-15 pm v5, her call: chip borders must match the input
                           fields sitting next to them — 1px borderBaseSubdued, not
                           the 1.5px #D6DDEA used on step-1 choice cards. */
                        border: 1px solid ${checked
                          ? euiTheme.colors.borderBasePrimary
                          : euiTheme.colors.borderBaseSubdued};
                        border-radius: ${euiTheme.border.radius.small};
                        background: ${checked
                          ? euiTheme.colors.backgroundBasePrimary
                          : euiTheme.colors.backgroundBasePlain};
                        cursor: pointer;
                        transition: border-color 200ms ease, background 200ms ease;
                        text-align: left;
                      `}
                    >
                      <div
                        css={css`
                          width: 16px;
                          height: 16px;
                          border: 1px solid ${checked
                            ? euiTheme.colors.borderBasePrimary
                            : euiTheme.colors.borderBaseSubdued};
                          border-radius: 3px;
                          background: ${checked ? euiTheme.colors.backgroundFilledPrimary : 'transparent'};
                          display: flex;
                          align-items: center;
                          justify-content: center;
                          flex-shrink: 0;
                          transition: background 200ms ease, border-color 200ms ease;
                        `}
                      >
                        {checked && <EuiIcon type="check" size="s" color="white" />}
                      </div>
                      <span
                        css={css`
                          font-size: 14px;
                          font-weight: ${euiTheme.font.weight.regular};
                          color: ${euiTheme.colors.textParagraph};
                        `}
                      >
                        {signal}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── AWS region — LEFT cell of row 1 (09-15 pm v3). Pairs with the
               static Signals cell so the auth toggle below never shifts it. ── */}
          <div css={css`order: 1; display: flex; flex-direction: column; gap: ${euiTheme.size.xs};`}>
            <label css={css`font-size: 12.25px; font-weight: ${euiTheme.font.weight.semiBold}; color: ${euiTheme.colors.textHeading};`}>
              AWS region
            </label>
            <EuiSelect
              compressed
              fullWidth
              options={AWS_REGIONS.map((r) => ({ value: r, text: r }))}
              value={config.region === '' ? globalRegion : config.region}
              onChange={(e) => {
                const val = e.target.value;
                onConfigChange({ region: val === globalRegion ? '' : val });
              }}
              css={css`
                transition: opacity 200ms ease;
                opacity: ${regionResetting ? 0.3 : 1};
                border-color: ${euiTheme.colors.borderBaseSubdued} !important;
                &:hover { border-color: ${euiTheme.colors.borderBasePlain} !important; }
              `}
            />
            {hasOverrideRegion && (
              <span css={css`font-size: 11px; color: ${euiTheme.colors.textSubdued}; display: flex; align-items: center; gap: 4px;`}>
                Overriding global &ldquo;{globalRegion}&rdquo;.{' '}
                <EuiButtonEmpty size="xs" flush="left" onClick={handleResetRegion} css={css`font-size: 11px; height: auto; padding: 0; line-height: 1;`}>
                  Reset
                </EuiButtonEmpty>
              </span>
            )}
          </div>

          {/* ── Auth method — LEFT cell of row 2 (09-15 pm v4, her call: the S3
               ARN input appears in the RIGHT cell next to it, mirroring row 1).
               Row 1 is static (region | signals), so toggling S3 ↔ CloudWatch
               only adds/removes the right cell — nothing above ever jumps. ── */}
          <div css={css`order: 3; display: flex; flex-direction: column; gap: ${euiTheme.size.xs};`}>
            <span css={css`font-size: 12.25px; font-weight: ${euiTheme.font.weight.semiBold}; color: ${euiTheme.colors.textHeading};`}>
              Auth method
            </span>

            {service.authOptions === 's3-only' ? (
              <div><EuiBadge color="default">S3</EuiBadge></div>
            ) : service.authOptions === 'cloudwatch-only' ? (
              /* Single static option → badge + note inline, side by side */
              <div css={css`display: flex; align-items: center; gap: ${euiTheme.size.s}; flex-wrap: wrap;`}>
                <EuiBadge color="default">CloudWatch</EuiBadge>
                <p css={css`margin: 0; font-size: 12px; line-height: 20px; color: ${euiTheme.colors.textSubdued}; font-weight: 400;`}>
                  Uses your agent&rsquo;s IAM credentials.
                </p>
              </div>
            ) : (
              /* Fills its grid cell — same edge as region above */
              <EuiButtonGroup
                legend="Authentication method"
                options={[{ id: 'S3', label: 'S3' }, { id: 'CloudWatch', label: 'CloudWatch' }]}
                idSelected={config.authMethod}
                onChange={(id) => onConfigChange({ authMethod: id as AuthMethod, s3ArnTouched: false })}
                buttonSize="compressed"
                isFullWidth
              />
            )}

            {/* Toggle set to CloudWatch → note below the toggle */}
            {service.authOptions === 'both' && config.authMethod === 'CloudWatch' && (
              <p css={css`margin: 0; font-size: 12px; line-height: 20px; color: ${euiTheme.colors.textSubdued}; font-weight: 400;`}>
                Uses your agent&rsquo;s IAM credentials.
              </p>
            )}
          </div>{/* end auth cell */}

          {/* S3 bucket ARN — RIGHT cell of row 2, appears next to the auth
              toggle when S3 is selected (09-15 pm v4, her call). */}
          {config.authMethod === 'S3' && (
            <div css={css`order: 4; display: flex; flex-direction: column; gap: ${euiTheme.size.xs};`}>
              <label css={css`font-size: 12.25px; font-weight: ${euiTheme.font.weight.semiBold}; color: ${euiTheme.colors.textHeading};`}>
                S3 bucket ARN
              </label>
              <div css={css`position: relative;`}>
                <EuiFieldText
                  compressed
                  fullWidth
                  placeholder="Type in S3 bucket ARN…"
                  value={config.s3Arn}
                  isInvalid={showArnError}
                  onChange={(e) => onConfigChange({ s3Arn: e.target.value, s3ArnTouched: true })}
                  onBlur={() => onConfigChange({ s3ArnTouched: true })}
                  css={css`
                    padding-right: ${arnCheckVisible ? '28px' : undefined};
                    &::placeholder,
                    &::-webkit-input-placeholder { font-weight: 400; color: ${euiTheme.colors.textSubdued}; }
                    border-color: ${showArnError
                      ? euiTheme.colors.borderBaseDanger
                      : arnCheckVisible
                      ? euiTheme.colors.borderBaseSuccess
                      : euiTheme.colors.borderBaseSubdued} !important;
                    transition: border-color 250ms ease;
                  `}
                />
                {arnCheckVisible && (
                  <div
                    css={css`position: absolute; right: 8px; top: 50%; animation: ${checkLife} 1800ms ease forwards;`}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <circle
                        cx="8"
                        cy="8"
                        r="7.25"
                        stroke={euiTheme.colors.success}
                        strokeWidth="1.25"
                        fill="none"
                      />
                      <path
                        d="M4.8 8.3L7 10.5L11.2 5.9"
                        stroke={euiTheme.colors.success}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        css={css`stroke-dasharray: 14; stroke-dashoffset: 14; animation: ${drawCheck} 320ms ease 120ms forwards;`}
                      />
                    </svg>
                  </div>
                )}
              </div>
              {showArnError && (
                <EuiText size="xs" color="danger">
                  <p css={css`margin: 0;`}>Complete required field before continuing.</p>
                </EuiText>
              )}
            </div>
          )}
        </div>{/* end expanded content */}
      </AccordionContent>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

export interface AwsSettingsSectionProps {
  /** Services selected in Step 1 */
  selectedServiceIds: ReadonlyArray<string>;
  allServices: ReadonlyArray<BundleService>;
  /**
   * Fires whenever the "can proceed" state changes.
   * Parent uses this to control the shared footer's Next button.
   */
  onCanProceedChange?: (canProceed: boolean) => void;
  /**
   * Called once on mount with the internal handleNext function.
   * Parent stores the ref and calls it when the shared Next button is clicked.
   */
  onNextReady?: (fn: () => void) => void;
  /** Called when all fields are valid and user advances (internal handleNext calls this). */
  onNext?: () => void;
  /** Reports the global region up so the Summary step can recap it (09-15). */
  onGlobalRegionChange?: (region: string) => void;
}

export const AwsSettingsSection = ({
  selectedServiceIds,
  allServices,
  onCanProceedChange,
  onNextReady,
  onNext,
  onGlobalRegionChange,
}: AwsSettingsSectionProps): React.ReactElement => {
  const { euiTheme } = useEuiTheme();

  const selectedServices = selectedServiceIds
    .map((id) => allServices.find((s) => s.id === id))
    .filter((s): s is BundleService => s !== undefined);

  const [globalRegion, setGlobalRegion] = useState('us-east-1');

  // Sort: services needing input (S3 auth = required ARN) always first (09-15)
  const sortedServices = useMemo(
    () =>
      [...selectedServices].sort((a, b) => {
        const aNeeds = a.defaultAuth === 'S3' ? 0 : 1;
        const bNeeds = b.defaultAuth === 'S3' ? 0 : 1;
        return aNeeds - bNeeds;
      }),
    [selectedServices]
  );

  const [expandedId, setExpandedId] = useState<string | null>(
    // Only auto-open if the service actually needs user input (S3 ARN or auth choice).
    // CloudWatch-only services have nothing to fill in — don't expand them by default.
    selectedServices.find(
      (s) => s.authOptions === 'both' || s.authOptions === 's3-only' || s.defaultAuth === 'S3'
    )?.id ?? null
  );
  const [configs, setConfigs] = useState<Map<string, ServiceConfig>>(
    () => new Map(selectedServices.map((s) => [s.id, initConfig(s)]))
  );
  // calloutVisible removed 09-15 — callout replaced by warning cards + disabled Next tooltip

  // Instances (09-15): one row per configurable instance. Originals key on the
  // service id; "Duplicate" inserts a peer row with copied config + own name.
  const [instances, setInstances] = useState<ServiceInstance[]>(() =>
    sortedServices.map((s) => ({ key: s.id, serviceId: s.id, isDuplicate: false }))
  );
  const [justAddedKey, setJustAddedKey] = useState<string | null>(null);

  const duplicateInstance = (key: string): void => {
    const idx = instances.findIndex((i) => i.key === key);
    if (idx === -1) return;
    const src = instances[idx];
    const service = selectedServices.find((s) => s.id === src.serviceId);
    if (!service) return;
    const count = instances.filter((i) => i.serviceId === src.serviceId).length;
    const newKey = `${src.serviceId}::dup-${Date.now()}`;
    setInstances((prev) => [
      ...prev.slice(0, idx + 1),
      { key: newKey, serviceId: src.serviceId, name: `${service.title} (${count + 1})`, isDuplicate: true },
      ...prev.slice(idx + 1),
    ]);
    setConfigs((prev) => {
      const next = new Map(prev);
      const srcCfg = prev.get(key);
      next.set(newKey, srcCfg !== undefined ? { ...srcCfg } : initConfig(service));
      return next;
    });
    setExpandedId(newKey);
    setJustAddedKey(newKey);
  };

  const removeInstance = (key: string): void => {
    setInstances((prev) => prev.filter((i) => i.key !== key));
    setConfigs((prev) => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
    setExpandedId((prev) => (prev === key ? null : prev));
  };

  const renameInstance = (key: string, name: string): void => {
    setInstances((prev) => prev.map((i) => (i.key === key ? { ...i, name } : i)));
  };

  const patchConfig = (id: string, patch: Partial<ServiceConfig>): void => {
    setConfigs((prev) => {
      const next = new Map(prev);
      const existing = next.get(id);
      if (existing) next.set(id, { ...existing, ...patch });
      return next;
    });
  };

  const handleToggle = (id: string): void => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleNext = (): void => {
    // Touch all S3 fields to surface any unresolved errors — per INSTANCE (09-15)
    const hasMissing = instances.some((i) => {
      const c = configs.get(i.key);
      return c !== undefined && c.authMethod === 'S3' && c.s3Arn.trim() === '';
    });

    if (hasMissing) {
      // Touch all configs + open first invalid
      setConfigs((prev) => {
        const next = new Map(prev);
        for (const [k, v] of next) {
          if (v.authMethod === 'S3' && v.s3Arn.trim() === '') {
            next.set(k, { ...v, s3ArnTouched: true });
          }
        }
        return next;
      });
      const firstInvalid = instances.find((i) => {
        const c = configs.get(i.key);
        return c !== undefined && c.authMethod === 'S3' && c.s3Arn.trim() === '';
      });
      if (firstInvalid) setExpandedId(firstInvalid.key);
      return;
    }
    onNext?.();
  };

  // Expose handleNext through a ref so the parent always calls the LATEST
  // closure. (09-15 bug: passing handleNext directly on mount froze the first
  // render's empty configs — Next validated against stale state and never fired.)
  const handleNextRef = useRef(handleNext);
  handleNextRef.current = handleNext;
  useEffect(() => {
    onNextReady?.(() => handleNextRef.current());
  }, [onNextReady]);

  const invalidCount = instances.filter((i) => {
    const c = configs.get(i.key);
    return c !== undefined && !isServiceValid(c);
  }).length;

  const overrideCount = instances.filter((i) => {
    const c = configs.get(i.key);
    return c !== undefined && c.region !== '' && c.region !== globalRegion;
  }).length;

  const canProceed = invalidCount === 0;

  // Notify parent whenever canProceed flips so it can control the shared footer
  const prevCanProceedRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (prevCanProceedRef.current !== canProceed) {
      prevCanProceedRef.current = canProceed;
      onCanProceedChange?.(canProceed);
    }
  }, [canProceed, onCanProceedChange]);

  return (
    <div
      css={css`
        display: flex;
        flex-direction: column;
        gap: ${euiTheme.size.l}; /* 24px — heading to cards (09-15) */
        width: 100%;
      `}
    >
      {/* ── Header — row: title+subtitle LEFT, region pill RIGHT (Figma 09-15) ── */}
      <div
        css={css`
          display: flex;
          flex-direction: row;
          align-items: center; /* 09-15: center title block against the 32px selector — title alone felt "flowing" */
          justify-content: space-between;
          gap: ${euiTheme.size.base};
        `}
      >
        {/* Left: title + live stats line (09-15 compromise — title alone felt
            flowing, stats alone lacked anchor; together they're wayfinding + status). */}
        <div css={css`display: flex; flex-direction: column; gap: 2px;`}>
          <StepSectionHeading>AWS Services settings</StepSectionHeading>
          <span css={css`font-size: 12.25px; font-weight: 400; color: ${euiTheme.colors.textSubdued};`}>
            {instances.length} service{instances.length === 1 ? '' : 's'}
            {invalidCount > 0 && (
              <span css={css`color: ${euiTheme.colors.textWarning};`}> · {invalidCount} need{invalidCount === 1 ? 's' : ''} input</span>
            )}
          </span>
        </div>

        {/* Right: selector + override helper text stacked */}
        <div css={css`display: flex; flex-direction: column; align-items: flex-end; gap: 4px;`}>
          <EuiSuperSelect
            compressed
            prepend="Global AWS region"
            options={AWS_REGIONS.map((r) => ({ value: r, inputDisplay: r }))}
            valueOfSelected={globalRegion}
            onChange={(val) => {
              setGlobalRegion(val);
              onGlobalRegionChange?.(val);
            }}
            css={css`min-width: 140px;`}
          />
          {/* Override helper — lives directly under the selector it describes */}
          {overrideCount > 0 && (
            <div css={css`display: flex; align-items: center; gap: 4px; font-size: 11px; color: ${euiTheme.colors.textSubdued};`}>
              <span>{overrideCount} service{overrideCount > 1 ? 's' : ''} overriding.</span>
              <EuiButtonEmpty
                size="xs"
                flush="left"
                onClick={() => {
                  setConfigs((prev) => {
                    const next = new Map(prev);
                    for (const [k, v] of next) next.set(k, { ...v, region: '' });
                    return next;
                  });
                }}
                css={css`font-size: 11px; height: auto; padding: 0; line-height: 1;`}
              >
                Reset all
              </EuiButtonEmpty>
            </div>
          )}
        </div>
      </div>

      {/* Callout removed 09-15 — warning cards + disabled Next tooltip carry the message */}

      {/* ── Service accordion list ───────────────────────────────────────────── */}
      <div
        css={css`
          display: flex;
          flex-direction: column;
          gap: ${euiTheme.size.m}; /* 12px between cards (09-15) */
        `}
      >
        {instances.length === 0 ? (
          <p
            css={css`
              font-size: 14px;
              color: ${euiTheme.colors.textSubdued};
              padding: ${euiTheme.size.l} 0;
              text-align: center;
            `}
          >
            No services selected — go back and choose at least one.
          </p>
        ) : (
          instances.map((instance) => {
            const service = selectedServices.find((s) => s.id === instance.serviceId);
            if (!service) return null;
            const config = configs.get(instance.key) ?? initConfig(service);
            return (
              <ServiceRow
                key={instance.key}
                service={service}
                config={config}
                isExpanded={expandedId === instance.key}
                globalRegion={globalRegion}
                onToggle={() => handleToggle(instance.key)}
                onConfigChange={(patch) => patchConfig(instance.key, patch)}
                displayName={instance.name ?? service.title}
                isDuplicate={instance.isDuplicate}
                justAdded={justAddedKey === instance.key}
                onDuplicate={() => duplicateInstance(instance.key)}
                onRemove={instance.isDuplicate ? () => removeInstance(instance.key) : undefined}
                onRename={instance.isDuplicate ? (name) => renameInstance(instance.key, name) : undefined}
              />
            );
          })
        )}
      </div>

      {/* Footer removed 09-15 — now rendered outside the bordered box by integration_landing */}
    </div>
  );
};
