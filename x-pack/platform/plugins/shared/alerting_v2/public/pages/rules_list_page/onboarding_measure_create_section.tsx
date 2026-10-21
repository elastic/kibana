/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import type { EuiSelectableOption, UseEuiTheme } from '@elastic/eui';
import {
  EuiBetaBadge,
  EuiButtonIcon,
  EuiCard,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiInputPopover,
  EuiPanel,
  EuiSelectable,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  euiCanAnimate,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { SvgAiGradientDefs, useSvgAiGradient } from '@kbn/ui-ai-components';
import { experimentalBadgeLabel } from '../../components/experimental_badge';
import { SparklesIcon } from './sparkles_icon';

/** Matches Discover QuickSearchVisor mode toggle (magnify + sparkles). */
const measureModeToggleStyles = ({ euiTheme }: UseEuiTheme) => ({
  modeToggle: css`
    position: relative;
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
    box-sizing: border-box;
    gap: ${euiTheme.size.xs};
    block-size: ${euiTheme.size.xl};
    max-block-size: ${euiTheme.size.xl};
    padding: ${euiTheme.size.xs};
    border-radius: ${euiTheme.border.radius.control};

    &::after {
      content: '';
      position: absolute;
      inset: 0;
      border: ${euiTheme.border.width.thin} solid ${euiTheme.components.forms.border};
      border-radius: inherit;
      pointer-events: none;
    }

    .euiButtonIcon {
      border-radius: calc(${euiTheme.border.radius.control} - ${euiTheme.size.xxs});
    }
  `,
  modeIconButton: css`
    &.euiButtonIcon {
      inline-size: ${euiTheme.size.l};
      block-size: ${euiTheme.size.l};
      border-radius: calc(${euiTheme.border.radius.control} - ${euiTheme.size.xxs});
      background-color: transparent;

      &:hover,
      &:focus,
      &:focus-visible {
        background-color: ${euiTheme.components.buttons.backgroundEmptyTextHover};
      }
    }
  `,
  modeIconButtonActive: css`
    &.euiButtonIcon,
    &.euiButtonIcon:hover,
    &.euiButtonIcon:focus,
    &.euiButtonIcon:focus-visible {
      background-color: ${euiTheme.colors.backgroundLightText};
    }
  `,
  aiButtonSparkleHover: css`
    overflow: visible;
    box-sizing: border-box;
    block-size: ${euiTheme.size.l};
    max-block-size: ${euiTheme.size.l};

    &::after {
      content: none;
    }

    @keyframes onboardingMeasureSparkleTwinkle {
      0%,
      100% {
        opacity: 1;
        transform: scale(1);
      }
      50% {
        opacity: 0.45;
        transform: scale(0.85);
      }
    }

    ${euiCanAnimate} {
      &:hover svg path,
      &:focus-visible svg path {
        transform-box: fill-box;
        transform-origin: center;
        animation-name: onboardingMeasureSparkleTwinkle;
        animation-duration: calc(${euiTheme.animation.extraSlow} * 2);
        animation-timing-function: ease-in-out;
        animation-iteration-count: infinite;
      }

      &:hover svg path:nth-of-type(2),
      &:focus-visible svg path:nth-of-type(2) {
        animation-delay: ${euiTheme.animation.slow};
      }

      &:hover svg path:nth-of-type(3),
      &:focus-visible svg path:nth-of-type(3) {
        animation-delay: ${euiTheme.animation.extraSlow};
      }
    }
  `,
  aiButtonSelected: css`
    background: linear-gradient(
      180deg,
      ${euiTheme.components.buttons.backgroundPrimaryHover} 18%,
      ${euiTheme.components.buttons.backgroundAssistanceHover} 83%
    ) !important;
  `,
});

const SEARCH_MODE_LABEL = i18n.translate('xpack.alertingV2.onboardingMeasure.searchModeLabel', {
  defaultMessage: 'Search suggestions',
});

const AI_MODE_LABEL = i18n.translate('xpack.alertingV2.onboardingMeasure.aiModeTooltip', {
  defaultMessage: 'Describe a rule in natural language with the AI agent',
});

const MODE_TOGGLE_LEGEND = i18n.translate('xpack.alertingV2.onboardingMeasure.modeToggleLegend', {
  defaultMessage: 'Switch between search and AI',
});

const MeasureModeToggle = ({
  isAiMode,
  onModeChange,
}: {
  isAiMode: boolean;
  onModeChange: (nextIsAiMode: boolean) => void;
}): JSX.Element => {
  const euiThemeContext = useEuiTheme();
  const styles = useMemo(() => measureModeToggleStyles(euiThemeContext), [euiThemeContext]);
  const { gradientId, iconGradientCss, colors } = useSvgAiGradient({ variant: 'outlined' });

  return (
    <div
      role="group"
      aria-label={MODE_TOGGLE_LEGEND}
      css={styles.modeToggle}
      data-test-subj="onboardingMeasureModeToggle"
    >
      <EuiToolTip content={SEARCH_MODE_LABEL} disableScreenReaderOutput>
        <EuiButtonIcon
          iconType="magnify"
          size="xs"
          iconSize="m"
          color="text"
          display="empty"
          aria-label={SEARCH_MODE_LABEL}
          aria-pressed={!isAiMode}
          isSelected={!isAiMode}
          onClick={() => onModeChange(false)}
          data-test-subj="onboardingMeasureSearchMode"
          css={[styles.modeIconButton, !isAiMode && styles.modeIconButtonActive]}
        />
      </EuiToolTip>
      {isAiMode ? <SvgAiGradientDefs gradientId={gradientId} colors={colors} /> : null}
      <EuiToolTip content={AI_MODE_LABEL} disableScreenReaderOutput>
        <EuiButtonIcon
          iconType={SparklesIcon}
          size="xs"
          iconSize="m"
          color="text"
          display="empty"
          aria-label={AI_MODE_LABEL}
          aria-pressed={isAiMode}
          isSelected={isAiMode}
          onClick={() => onModeChange(true)}
          data-test-subj="onboardingMeasureAiMode"
          css={[
            styles.modeIconButton,
            isAiMode && styles.aiButtonSparkleHover,
            isAiMode && styles.aiButtonSelected,
            isAiMode && iconGradientCss,
          ]}
        />
      </EuiToolTip>
    </div>
  );
};

type DataDomain = 'infra' | 'apm' | 'ml' | 'logs' | 'synthetics' | 'slo' | 'custom' | 'specific';
type CreatePath = 'threshold' | 'esql';

const DEFAULT_CREATE_PATHS: CreatePath[] = ['threshold', 'esql'];

type DataDomainOption = {
  id: DataDomain;
  label: string;
  description: string;
  prefersClassic?: boolean;
  classicSearch?: string;
  createPaths: CreatePath[];
  hint: string;
  examplePrompt: string;
};

type DomainSuggestionOption = EuiSelectableOption & {
  description?: string;
};

const DATA_DOMAIN_OPTIONS: DataDomainOption[] = [
  {
    id: 'infra',
    label: i18n.translate('xpack.alertingV2.onboardingMeasure.domainInfra', {
      defaultMessage: 'Infrastructure metrics',
    }),
    description: i18n.translate('xpack.alertingV2.onboardingMeasure.domainInfraDescription', {
      defaultMessage: 'CPU, memory, disk, network on hosts or containers',
    }),
    createPaths: ['threshold', 'esql'],
    hint: i18n.translate('xpack.alertingV2.onboardingMeasure.domainInfraHint', {
      defaultMessage: 'Start with a Threshold rule, or turn on AI mode to describe the condition.',
    }),
    examplePrompt: i18n.translate('xpack.alertingV2.onboardingMeasure.domainInfraExample', {
      defaultMessage: 'CPU, memory, disk, network on hosts or containers',
    }),
  },
  {
    id: 'apm',
    label: i18n.translate('xpack.alertingV2.onboardingMeasure.domainApm', {
      defaultMessage: 'Application / APM',
    }),
    description: i18n.translate('xpack.alertingV2.onboardingMeasure.domainApmDescription', {
      defaultMessage: 'Error rates, latency, throughput for services',
    }),
    prefersClassic: true,
    classicSearch: 'APM',
    createPaths: [],
    hint: i18n.translate('xpack.alertingV2.onboardingMeasure.domainApmHint', {
      defaultMessage: 'APM rules are only supported in Classic alerting.',
    }),
    examplePrompt: i18n.translate('xpack.alertingV2.onboardingMeasure.domainApmExample', {
      defaultMessage: 'APM',
    }),
  },
  {
    id: 'ml',
    label: i18n.translate('xpack.alertingV2.onboardingMeasure.domainMl', {
      defaultMessage: 'Machine Learning',
    }),
    description: i18n.translate('xpack.alertingV2.onboardingMeasure.domainMlDescription', {
      defaultMessage: 'Anomaly detection jobs and ML-based alerts',
    }),
    prefersClassic: true,
    classicSearch: 'Anomaly',
    createPaths: [],
    hint: i18n.translate('xpack.alertingV2.onboardingMeasure.domainMlHint', {
      defaultMessage: 'Anomaly detection and ML rules are only supported in Classic alerting.',
    }),
    examplePrompt: i18n.translate('xpack.alertingV2.onboardingMeasure.domainMlExample', {
      defaultMessage: 'Anomaly',
    }),
  },
  {
    id: 'logs',
    label: i18n.translate('xpack.alertingV2.onboardingMeasure.domainLogs', {
      defaultMessage: 'Logs',
    }),
    description: i18n.translate('xpack.alertingV2.onboardingMeasure.domainLogsDescription', {
      defaultMessage: 'Error counts, patterns, or spikes in log data',
    }),
    createPaths: ['threshold', 'esql'],
    hint: i18n.translate('xpack.alertingV2.onboardingMeasure.domainLogsHint', {
      defaultMessage:
        'Use Threshold for counts, ES|QL for custom queries, or AI mode to describe what you want.',
    }),
    examplePrompt: i18n.translate('xpack.alertingV2.onboardingMeasure.domainLogsExample', {
      defaultMessage: 'Error counts, patterns, or spikes in log data',
    }),
  },
  {
    id: 'synthetics',
    label: i18n.translate('xpack.alertingV2.onboardingMeasure.domainSynthetics', {
      defaultMessage: 'Synthetics / Uptime',
    }),
    description: i18n.translate('xpack.alertingV2.onboardingMeasure.domainSyntheticsDescription', {
      defaultMessage: 'Availability and response times for endpoints and journeys',
    }),
    prefersClassic: true,
    classicSearch: 'Synthetics',
    createPaths: [],
    hint: i18n.translate('xpack.alertingV2.onboardingMeasure.domainSyntheticsHint', {
      defaultMessage: 'Synthetics and Uptime rules are only supported in Classic alerting.',
    }),
    examplePrompt: i18n.translate('xpack.alertingV2.onboardingMeasure.domainSyntheticsExample', {
      defaultMessage: 'Synthetics',
    }),
  },
  {
    id: 'slo',
    label: i18n.translate('xpack.alertingV2.onboardingMeasure.domainSlo', {
      defaultMessage: 'SLOs',
    }),
    description: i18n.translate('xpack.alertingV2.onboardingMeasure.domainSloDescription', {
      defaultMessage: 'Burn rate and error budget for service level objectives',
    }),
    prefersClassic: true,
    classicSearch: 'SLOs',
    createPaths: [],
    hint: i18n.translate('xpack.alertingV2.onboardingMeasure.domainSloHint', {
      defaultMessage: 'SLO burn-rate rules are only supported in Classic alerting.',
    }),
    examplePrompt: i18n.translate('xpack.alertingV2.onboardingMeasure.domainSloExample', {
      defaultMessage: 'SLOs',
    }),
  },
  {
    id: 'custom',
    label: i18n.translate('xpack.alertingV2.onboardingMeasure.domainCustom', {
      defaultMessage: 'Custom index',
    }),
    description: i18n.translate('xpack.alertingV2.onboardingMeasure.domainCustomDescription', {
      defaultMessage: 'Query a specific index with ES|QL or a threshold',
    }),
    createPaths: ['esql', 'threshold'],
    hint: i18n.translate('xpack.alertingV2.onboardingMeasure.domainCustomHint', {
      defaultMessage: 'ES|QL is the best fit when you already know the index and query shape.',
    }),
    examplePrompt: i18n.translate('xpack.alertingV2.onboardingMeasure.domainCustomExample', {
      defaultMessage: 'I have a specific index I want to query',
    }),
  },
];

const SPECIFIC_DOMAIN_FALLBACK: DataDomainOption = {
  id: 'specific',
  label: '',
  description: '',
  createPaths: ['threshold', 'esql'],
  hint: i18n.translate('xpack.alertingV2.onboardingMeasure.domainSpecificHint', {
    defaultMessage: 'Turn on AI mode to describe it, or start from a Threshold builder.',
  }),
  examplePrompt: '',
};

const inferDataDomain = (text: string): DataDomain | null => {
  const value = text.trim().toLowerCase();
  if (!value) {
    return null;
  }
  if (/\b(apm|transaction|span|trace|latency|throughput)\b/.test(value)) {
    return 'apm';
  }
  if (/\b(ml|anomaly|anomalies|machine learning)\b/.test(value)) {
    return 'ml';
  }
  if (/\b(synthetics?|uptime|heartbeat|monitor journey|ping check)\b/.test(value)) {
    return 'synthetics';
  }
  if (/\b(slo|slis?|error budget|burn rate)\b/.test(value)) {
    return 'slo';
  }
  if (/\b(metric threshold|log threshold|index threshold)\b/.test(value)) {
    return /\blog threshold\b/.test(value) ? 'logs' : 'infra';
  }
  if (/\bthreshold\b/.test(value)) {
    return /\blog\b/.test(value) ? 'logs' : 'infra';
  }
  if (/\b(from |stats |where |esql)\b/.test(value) || value.includes('|') || value.includes('*')) {
    return 'custom';
  }
  if (/\b(log|logs|error message|stacktrace)\b/.test(value)) {
    return 'logs';
  }
  if (/\b(cpu|memory|disk|host|container|pod|infra|metric)\b/.test(value)) {
    return 'infra';
  }
  if (value.length >= 12) {
    return 'specific';
  }
  return null;
};

const LargeOptionCard = ({
  iconType,
  title,
  description,
  onClick,
  badge,
  'data-test-subj': dataTestSubj,
}: {
  iconType: string;
  title: string;
  description: string;
  onClick: () => void;
  badge?: React.ReactNode;
  'data-test-subj': string;
}) => (
  <EuiCard
    layout="horizontal"
    display="plain"
    titleElement="h3"
    titleSize="xs"
    hasBorder
    title={
      badge ? (
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>{title}</EuiFlexItem>
          <EuiFlexItem grow={false}>{badge}</EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        title
      )
    }
    description={description}
    onClick={onClick}
    icon={<EuiIcon type={iconType} color="text" size="l" aria-hidden={true} />}
    data-test-subj={dataTestSubj}
  />
);

const ClassicContinueCard = ({
  title,
  description,
  onClick,
  'data-test-subj': dataTestSubj,
}: {
  title: string;
  description: string;
  onClick: () => void;
  'data-test-subj': string;
}) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiPanel
      element="button"
      hasBorder
      paddingSize="m"
      onClick={onClick}
      data-test-subj={dataTestSubj}
      css={css`
        text-align: left;
        cursor: pointer;
        background-color: ${euiTheme.colors.backgroundBaseSubdued};
      `}
    >
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
        <EuiFlexItem>
          <EuiText size="s">
            <strong>{title}</strong>
          </EuiText>
          <EuiText size="xs" color="subdued">
            {description}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIcon type="arrowRight" color="subdued" aria-hidden={true} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

export interface OnboardingMeasureCreateSectionProps {
  onChooseThreshold: () => void;
  onChooseEsql: () => void;
  onChooseAgent: (userInput?: string) => void;
  onChooseSequence: () => void;
  onBrowseClassic: (search?: string) => void;
  showClassic?: boolean;
}

/**
 * Search-driven create paths for onboarding: suggest Threshold / ES|QL / Sequence,
 * or fall back to Classic when the domain is not Universal-ready.
 */
export const OnboardingMeasureCreateSection = ({
  onChooseThreshold,
  onChooseEsql,
  onChooseAgent,
  onChooseSequence,
  onBrowseClassic,
  showClassic = true,
}: OnboardingMeasureCreateSectionProps): JSX.Element => {
  const { euiTheme } = useEuiTheme();
  const [measureText, setMeasureText] = useState('');
  const [isAiMode, setIsAiMode] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<DataDomain | null>(null);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);

  const inferredDomain = useMemo(() => inferDataDomain(measureText), [measureText]);
  const activeDomainId = selectedDomain ?? inferredDomain;
  const activeDomain =
    activeDomainId === 'specific'
      ? SPECIFIC_DOMAIN_FALLBACK
      : DATA_DOMAIN_OPTIONS.find((option) => option.id === activeDomainId) ?? null;

  const prefersClassic = Boolean(activeDomain?.prefersClassic && showClassic);
  const createPathIds = activeDomain?.createPaths ?? DEFAULT_CREATE_PATHS;

  const domainSuggestionOptions = useMemo<DomainSuggestionOption[]>(
    () =>
      DATA_DOMAIN_OPTIONS.map((option) => ({
        label: option.label,
        key: option.id,
        description: option.description,
        checked: selectedDomain === option.id ? ('on' as const) : undefined,
        'data-test-subj': `onboardingMeasureDomain-${option.id}`,
      })),
    [selectedDomain]
  );

  const selectDomainSuggestion = (domain: DataDomain) => {
    const option = DATA_DOMAIN_OPTIONS.find((item) => item.id === domain);
    setSelectedDomain(domain);
    setMeasureText(option?.classicSearch ?? option?.label ?? '');
    setIsSuggestionsOpen(false);
  };

  const classicBrowseSearch = useMemo(() => {
    const trimmed = measureText.trim();
    if (!trimmed) {
      return undefined;
    }
    if (
      activeDomain?.classicSearch &&
      (trimmed === activeDomain.classicSearch ||
        trimmed === activeDomain.label ||
        trimmed === activeDomain.description)
    ) {
      return activeDomain.classicSearch;
    }
    return trimmed;
  }, [activeDomain, measureText]);

  const onMeasureTextChange = (value: string) => {
    setMeasureText(value);
    const normalized = value.trim().toLowerCase();
    const matchingSuggestion = DATA_DOMAIN_OPTIONS.find(
      (option) =>
        option.classicSearch?.toLowerCase() === normalized ||
        option.label.toLowerCase() === normalized ||
        option.examplePrompt.toLowerCase() === normalized ||
        option.description.toLowerCase() === normalized
    );
    setSelectedDomain(matchingSuggestion?.id ?? null);
  };

  const createOptionById: Record<CreatePath, React.ReactNode> = {
    threshold: (
      <LargeOptionCard
        key="threshold"
        iconType="visGauge"
        title={i18n.translate('xpack.alertingV2.onboardingMeasure.thresholdTitle', {
          defaultMessage: 'Threshold',
        })}
        description={i18n.translate('xpack.alertingV2.onboardingMeasure.thresholdDescription', {
          defaultMessage:
            'Alert when metrics or counts cross a threshold. Covers metric, log, and index threshold-style rules. No query required.',
        })}
        onClick={onChooseThreshold}
        data-test-subj="onboardingMeasureChooseThreshold"
      />
    ),
    esql: (
      <LargeOptionCard
        key="esql"
        iconType="code"
        title={i18n.translate('xpack.alertingV2.onboardingMeasure.esqlTitle', {
          defaultMessage: 'ES|QL rule',
        })}
        description={i18n.translate('xpack.alertingV2.onboardingMeasure.esqlDescription', {
          defaultMessage: 'Write your own ES|QL query and preview the results live.',
        })}
        onClick={onChooseEsql}
        data-test-subj="onboardingMeasureChooseEsql"
      />
    ),
  };

  const createCards = createPathIds.map((id) => createOptionById[id]);

  const onMeasureSearch = (value: string) => {
    if (isAiMode) {
      onChooseAgent(value.trim() || undefined);
    }
  };

  const cardStack = css`
    display: flex;
    flex-direction: column;
    gap: ${euiTheme.size.s};
  `;

  return (
    <div data-test-subj="onboardingMeasureCreateSection">
      <EuiText size="s">
        <strong>
          <FormattedMessage
            id="xpack.alertingV2.onboardingMeasure.measureQuestion"
            defaultMessage="What do you want to measure?"
          />
        </strong>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <MeasureModeToggle
            isAiMode={isAiMode}
            onModeChange={(nextIsAiMode) => {
              setIsAiMode(nextIsAiMode);
              if (!nextIsAiMode) {
                setSelectedDomain(null);
                setMeasureText('');
                setIsSuggestionsOpen(false);
              }
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem>
              {isAiMode ? (
                <EuiFieldSearch
                  fullWidth
                  compressed
                  value={measureText}
                  onChange={(event) => onMeasureTextChange(event.target.value)}
                  onSearch={onMeasureSearch}
                  placeholder={i18n.translate(
                    'xpack.alertingV2.onboardingMeasure.aiModePlaceholder',
                    {
                      defaultMessage: 'Describe the rule you want in natural language',
                    }
                  )}
                  data-test-subj="onboardingMeasureSearch"
                />
              ) : (
                <EuiInputPopover
                  fullWidth
                  disableFocusTrap
                  panelPaddingSize="none"
                  isOpen={isSuggestionsOpen}
                  closePopover={() => setIsSuggestionsOpen(false)}
                  input={
                    <EuiFieldSearch
                      fullWidth
                      compressed
                      value={measureText}
                      onChange={(event) => {
                        onMeasureTextChange(event.target.value);
                        setIsSuggestionsOpen(true);
                      }}
                      onFocus={() => setIsSuggestionsOpen(true)}
                      placeholder={i18n.translate(
                        'xpack.alertingV2.onboardingMeasure.measurePlaceholder',
                        {
                          defaultMessage:
                            'Search or pick a suggestion — metrics, APM, logs, synthetics, SLOs…',
                        }
                      )}
                      data-test-subj="onboardingMeasureSearch"
                      aria-label={i18n.translate(
                        'xpack.alertingV2.onboardingMeasure.measureSearchAriaLabel',
                        {
                          defaultMessage: 'What do you want to measure?',
                        }
                      )}
                    />
                  }
                >
                  <EuiSelectable<DomainSuggestionOption>
                    singleSelection
                    options={domainSuggestionOptions}
                    onChange={(options) => {
                      const selected = options.find((option) => option.checked === 'on');
                      if (selected?.key) {
                        selectDomainSuggestion(selected.key as DataDomain);
                      }
                    }}
                    renderOption={(option) => (
                      <div>
                        <EuiText size="s">
                          <strong>{option.label}</strong>
                        </EuiText>
                        {option.description ? (
                          <EuiText size="xs" color="subdued">
                            {option.description}
                          </EuiText>
                        ) : null}
                      </div>
                    )}
                    listProps={{ rowHeight: 56, showIcons: true }}
                    data-test-subj="onboardingMeasureSuggestions"
                  >
                    {(list) => list}
                  </EuiSelectable>
                </EuiInputPopover>
              )}
            </EuiFlexItem>
            {isAiMode ? (
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  content={i18n.translate('xpack.alertingV2.onboardingMeasure.submitTooltip', {
                    defaultMessage: 'Submit',
                  })}
                >
                  <EuiButtonIcon
                    size="s"
                    iconType="return"
                    color="primary"
                    display="base"
                    aria-label={i18n.translate('xpack.alertingV2.onboardingMeasure.submitLabel', {
                      defaultMessage: 'Submit',
                    })}
                    onClick={() => onMeasureSearch(measureText)}
                    data-test-subj="onboardingMeasureSubmit"
                  />
                </EuiToolTip>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiText size="s" color="subdued">
        <p>
          {isAiMode ? (
            <FormattedMessage
              id="xpack.alertingV2.onboardingMeasure.aiModeHint"
              defaultMessage="Submit to start the AI agent with your description."
            />
          ) : activeDomain ? (
            activeDomain.hint
          ) : (
            <FormattedMessage
              id="xpack.alertingV2.onboardingMeasure.createHint"
              defaultMessage="Start with a guided builder, write an ES|QL query, or turn on AI mode to describe what you want."
            />
          )}
        </p>
      </EuiText>
      <EuiSpacer size="s" />

      {prefersClassic && !isAiMode ? (
        <ClassicContinueCard
          title={i18n.translate('xpack.alertingV2.onboardingMeasure.continueClassicTitle', {
            defaultMessage: 'Continue in Classic',
          })}
          description={i18n.translate(
            'xpack.alertingV2.onboardingMeasure.continueClassicDescription',
            {
              defaultMessage: 'Browse Classic rule types and templates for this data domain.',
            }
          )}
          onClick={() => onBrowseClassic(classicBrowseSearch)}
          data-test-subj="onboardingMeasureContinueClassic"
        />
      ) : (
        <>
          <EuiHorizontalRule margin="s" />
          <EuiText size="xs">
            <strong>
              <FormattedMessage
                id="xpack.alertingV2.onboardingMeasure.createSection"
                defaultMessage="Create"
              />
            </strong>
          </EuiText>
          <EuiSpacer size="s" />
          <div css={cardStack}>{createCards}</div>
          <EuiSpacer size="m" />
          <EuiText size="xs">
            <strong>
              <FormattedMessage
                id="xpack.alertingV2.onboardingMeasure.rulesOnRulesSection"
                defaultMessage="Rules on Rules"
              />
            </strong>
          </EuiText>
          <EuiSpacer size="s" />
          <div css={cardStack}>
            <LargeOptionCard
              iconType="branch"
              title={i18n.translate('xpack.alertingV2.onboardingMeasure.sequenceTitle', {
                defaultMessage: 'Sequence',
              })}
              description={i18n.translate(
                'xpack.alertingV2.onboardingMeasure.sequenceDescription',
                {
                  defaultMessage: 'Chain rules for multi-step patterns.',
                }
              )}
              onClick={onChooseSequence}
              badge={
                <EuiBetaBadge
                  label={experimentalBadgeLabel}
                  size="s"
                  color="hollow"
                  tooltipContent={i18n.translate(
                    'xpack.alertingV2.onboardingMeasure.sequenceExperimentalTooltip',
                    {
                      defaultMessage: 'This feature is experimental and may change.',
                    }
                  )}
                />
              }
              data-test-subj="onboardingMeasureChooseSequence"
            />
          </div>
        </>
      )}
    </div>
  );
};
