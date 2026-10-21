/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiIllustration,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiSteps,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiStepStatus } from '@elastic/eui';
import { communication } from '@elastic/eui-illustrations';
import type { EuiIllustrationSource } from '@elastic/eui-illustrations';
import { css } from '@emotion/react';
import {
  DEMO_BASE_QUERY,
  DEMO_SHAPE_HIGHLIGHT_SEGMENT,
  HighlightedEsqlBlock,
  QueryPipelineExplainer,
} from '@kbn/alerting-v2-rule-form';
import { PluginStart } from '@kbn/core-di';
import { CoreStart, useService } from '@kbn/core-di-browser';
import {
  OBSERVABILITY_ONBOARDING_LOCATOR,
  type ObservabilityOnboardingLocatorParams,
} from '@kbn/deeplinks-observability';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import onboardingAlertsDiscoverImg from '../../assets/onboarding_alerts_discover.jpg';
import onboardingAlertsTriageImg from '../../assets/onboarding_alerts_triage.jpg';
import { FullscreenPageModal } from '../../components/fullscreen_page_modal/fullscreen_page_modal';
import { OnboardingLifecycleTimelineDemo } from './onboarding_lifecycle_timeline_demo';
import { OnboardingMeasureCreateSection } from './onboarding_measure_create_section';
import {
  type OnboardingSignals,
  useOnboardingSignals,
} from './use_onboarding_signals';

export interface AlertingOnboardingModalProps {
  onClose: () => void;
  onCreateEsqlRule: () => void;
  onCreateThresholdRule: () => void;
  onCreateWithAgent: (userInput?: string) => void;
  onBuildSequence: () => void;
  onBrowseClassic: (search?: string) => void;
  onCreateActionPolicy: () => void;
  documentationHref: string;
  /** When false, Classic-only domains still show Universal create paths. */
  showClassic?: boolean;
  /** Test / host overrides for personalization signals. */
  signalsOverride?: OnboardingSignals;
}

type AdvantageSelectorCardAsset =
  | {
      type: 'illustration';
      illustration: EuiIllustrationSource;
      illustrationAlt: string;
    }
  | {
      type: 'screenshot';
      src: string;
      alt: string;
    }
  | {
      type: 'highlightedQuery';
      query: string;
      highlightSegment: string;
    }
  | { type: 'lifecycleTimeline' };

interface AdvantageSelectorCard {
  id: string;
  title: string;
  description: string;
  asset: AdvantageSelectorCardAsset;
}

/** Shape + lifecycle + Discover + triage — formerly two accordions. */
const ALERT_AS_DATA_YOU_CONTROL_CARDS: AdvantageSelectorCard[] = [
  {
    id: 'shape',
    title: i18n.translate(
      'xpack.alertingV2.rulesList.onboardingModal.advantages.alertAsData.card.shape.title',
      { defaultMessage: 'You shape the alert' }
    ),
    description: i18n.translate(
      'xpack.alertingV2.rulesList.onboardingModal.advantages.alertAsData.card.shape.description',
      {
        defaultMessage: 'Returned fields, severity, and grouping are yours to define.',
      }
    ),
    asset: {
      type: 'highlightedQuery',
      query: DEMO_BASE_QUERY,
      highlightSegment: DEMO_SHAPE_HIGHLIGHT_SEGMENT,
    },
  },
  {
    id: 'lifecycle',
    title: i18n.translate(
      'xpack.alertingV2.rulesList.onboardingModal.advantages.alertAsData.card.lifecycle.title',
      { defaultMessage: 'Lifecycle you control' }
    ),
    description: i18n.translate(
      'xpack.alertingV2.rulesList.onboardingModal.advantages.alertAsData.card.lifecycle.description',
      {
        defaultMessage:
          'Tune alert delay, recovery, and no-data behavior so brief spikes do not flap.',
      }
    ),
    asset: { type: 'lifecycleTimeline' },
  },
  {
    id: 'discover',
    title: i18n.translate(
      'xpack.alertingV2.rulesList.onboardingModal.advantages.alertAsData.card.discover.title',
      { defaultMessage: 'Discover' }
    ),
    description: i18n.translate(
      'xpack.alertingV2.rulesList.onboardingModal.advantages.alertAsData.card.discover.description',
      {
        defaultMessage: 'Search alerts in Discover, build dashboards, or write rules on top of them.',
      }
    ),
    asset: {
      type: 'screenshot',
      src: onboardingAlertsDiscoverImg,
      alt: i18n.translate(
        'xpack.alertingV2.rulesList.onboardingModal.advantages.alertAsData.card.discover.screenshotAlt',
        {
          defaultMessage:
            'Discover showing an ES|QL query over alert episodes alongside logs',
        }
      ),
    },
  },
  {
    id: 'triage',
    title: i18n.translate(
      'xpack.alertingV2.rulesList.onboardingModal.advantages.alertAsData.card.triage.title',
      { defaultMessage: 'One place to triage' }
    ),
    description: i18n.translate(
      'xpack.alertingV2.rulesList.onboardingModal.advantages.alertAsData.card.triage.description',
      {
        defaultMessage:
          'Universal and Classic alerts share an inbox. Nothing has to migrate to get started.',
      }
    ),
    asset: {
      type: 'screenshot',
      src: onboardingAlertsTriageImg,
      alt: i18n.translate(
        'xpack.alertingV2.rulesList.onboardingModal.advantages.alertAsData.card.triage.screenshotAlt',
        {
          defaultMessage:
            'Alerts page showing Universal and Classic alerts in one triage inbox',
        }
      ),
    },
  },
];

const ADVANTAGES: Array<{
  id: string;
  icon: 'search' | 'controls' | 'bell' | 'database';
  title: string;
  description: string;
  illustration?: EuiIllustrationSource;
  illustrationAlt?: string;
  /** Interactive demo instead of a static illustration. */
  expandedDemo?: 'queryPipeline' | 'alertAsDataYouControl';
}> = [
  {
    id: 'query',
    icon: 'search',
    title: i18n.translate('xpack.alertingV2.rulesList.onboardingModal.advantages.query.title', {
      defaultMessage: 'Rules: Any condition you can query',
    }),
    description: i18n.translate(
      'xpack.alertingV2.rulesList.onboardingModal.advantages.query.description',
      {
        defaultMessage:
          'Write an ES|QL rule or use the threshold builder — you are not limited to a fixed rule-type form.',
      }
    ),
    expandedDemo: 'queryPipeline',
  },
  {
    id: 'alertAsData',
    icon: 'database',
    title: i18n.translate(
      'xpack.alertingV2.rulesList.onboardingModal.advantages.alertAsData.title',
      {
        defaultMessage: 'Alerts you shape and use as data',
      }
    ),
    description: i18n.translate(
      'xpack.alertingV2.rulesList.onboardingModal.advantages.alertAsData.description',
      {
        defaultMessage:
          'Define fields, severity, and lifecycle — then search, visualize, and triage alerts like any other Elasticsearch data.',
      }
    ),
    expandedDemo: 'alertAsDataYouControl',
  },
  {
    id: 'policies',
    icon: 'bell',
    title: i18n.translate('xpack.alertingV2.rulesList.onboardingModal.advantages.policies.title', {
      defaultMessage: 'Notifications separate from rules',
    }),
    description: i18n.translate(
      'xpack.alertingV2.rulesList.onboardingModal.advantages.policies.description',
      {
        defaultMessage:
          'Action policies select, group, and throttle across many rules without editing each one.',
      }
    ),
    illustration: communication,
    illustrationAlt: i18n.translate(
      'xpack.alertingV2.rulesList.onboardingModal.advantages.policies.illustrationAlt',
      { defaultMessage: 'Illustration of shared notification policies' }
    ),
  },
];

type ChecklistStepId = 'data' | 'classic' | 'create';

interface ChecklistItem {
  id: ChecklistStepId;
  title: string;
  description?: string;
  complete: boolean;
  actionLabel?: string;
  /** Status-only steps (data / Classic) — title only when complete. */
  compact?: boolean;
}

type OnboardingSection = 'setup' | 'why';

const SECTION_TITLES: Record<OnboardingSection, string> = {
  setup: i18n.translate('xpack.alertingV2.rulesList.onboardingModal.section.setup.title', {
    defaultMessage: 'Get started — your setup',
  }),
  why: i18n.translate('xpack.alertingV2.rulesList.onboardingModal.section.why.title', {
    defaultMessage: "What's new on Kibana Universal Alerting",
  }),
};

interface OnboardingAdvantageSelectorPanelProps {
  cards: AdvantageSelectorCard[];
  intro: React.ReactNode;
  testSubj: string;
  cardTestSubjPrefix: string;
}

/**
 * Security Get started–style selector: cards on the left, asset/demo on the right.
 */
const OnboardingAdvantageSelectorPanel = ({
  cards,
  intro,
  testSubj,
  cardTestSubjPrefix,
}: OnboardingAdvantageSelectorPanelProps): JSX.Element => {
  const { euiTheme } = useEuiTheme();
  const [selectedCardId, setSelectedCardId] = useState(cards[0].id);
  const selectedCard = cards.find((card) => card.id === selectedCardId) ?? cards[0];

  const styles = useMemo(
    () => ({
      panel: css`
        display: flex;
        flex-direction: column;
        text-align: start;
      `,
      columns: css`
        display: flex;
        flex-direction: row;
        gap: ${euiTheme.size.xl};
        align-items: center;
      `,
      content: css`
        flex: 1 1 50%;
        min-inline-size: 0;
      `,
      intro: css`
        p {
          margin-block: 0;
        }
      `,
      selectedCard: css`
        border: 1px solid ${euiTheme.colors.primary};
        background-color: ${euiTheme.colors.backgroundBasePrimary};
      `,
      assetColumn: css`
        flex: 1 1 50%;
        min-inline-size: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      `,
      asset: css`
        inline-size: 100%;
        max-inline-size: 100%;
        display: block;
        line-height: 0;
      `,
      screenshot: css`
        inline-size: 100%;
        max-inline-size: 100%;
        display: block;
        border-radius: ${euiTheme.border.radius.medium};
        border: ${euiTheme.border.thin};
        box-shadow: 0 ${euiTheme.size.xs} ${euiTheme.size.m} rgba(0, 0, 0, 0.08);
      `,
    }),
    [euiTheme]
  );

  const renderAsset = () => {
    if (selectedCard.asset.type === 'lifecycleTimeline') {
      return (
        <div css={styles.assetColumn}>
          <div css={styles.asset}>
            <OnboardingLifecycleTimelineDemo />
          </div>
        </div>
      );
    }
    if (selectedCard.asset.type === 'screenshot') {
      return (
        <div css={styles.assetColumn}>
          <img
            src={selectedCard.asset.src}
            alt={selectedCard.asset.alt}
            css={styles.screenshot}
          />
        </div>
      );
    }
    if (selectedCard.asset.type === 'highlightedQuery') {
      return (
        <div css={styles.assetColumn}>
          <div css={styles.asset} data-test-subj="alertingOnboardingAlertAsDataShapeQuery">
            <HighlightedEsqlBlock
              query={selectedCard.asset.query}
              highlightSegment={selectedCard.asset.highlightSegment}
              maxHeight={360}
            />
          </div>
        </div>
      );
    }
    return (
      <div css={styles.assetColumn}>
        <EuiIllustration
          type={selectedCard.asset.illustration}
          alt={selectedCard.asset.illustrationAlt}
          css={styles.asset}
        />
      </div>
    );
  };

  return (
    <div css={styles.panel} data-test-subj={testSubj}>
      <EuiText size="s" color="subdued" css={styles.intro}>
        <p>{intro}</p>
      </EuiText>
      <EuiSpacer size="m" />
      <div css={styles.columns}>
        <div css={styles.content}>
          <EuiFlexGroup direction="column" gutterSize="s">
            {cards.map((card) => {
              const isSelected = card.id === selectedCard.id;
              return (
                <EuiFlexItem key={card.id} grow={false}>
                  <EuiPanel
                    hasBorder
                    paddingSize="m"
                    element="button"
                    color={isSelected ? 'subdued' : 'plain'}
                    css={isSelected ? styles.selectedCard : undefined}
                    onClick={() => setSelectedCardId(card.id)}
                    aria-pressed={isSelected}
                    data-test-subj={`${cardTestSubjPrefix}-${card.id}`}
                    data-selected={isSelected ? true : undefined}
                  >
                    <EuiTitle size="xxs">
                      <h4>{card.title}</h4>
                    </EuiTitle>
                    <EuiSpacer size="xs" />
                    <EuiText size="xs">{card.description}</EuiText>
                  </EuiPanel>
                </EuiFlexItem>
              );
            })}
          </EuiFlexGroup>
        </div>
        {renderAsset()}
      </div>
    </div>
  );
};

/**
 * Fullscreen interactive onboarding for Universal Alerting.
 */
export const AlertingOnboardingModal = ({
  onClose,
  onCreateEsqlRule,
  onCreateThresholdRule,
  onCreateWithAgent,
  onBuildSequence,
  onBrowseClassic,
  onCreateActionPolicy,
  documentationHref,
  showClassic = true,
  signalsOverride,
}: AlertingOnboardingModalProps): JSX.Element => {
  const { euiTheme } = useEuiTheme();
  const application = useService(CoreStart('application'));
  const share = useService(PluginStart('share')) as SharePluginStart;
  const liveSignals = useOnboardingSignals();
  const signals = signalsOverride ?? liveSignals;
  const [activeSection, setActiveSection] = useState<OnboardingSection>('why');
  const [activeAdvantageId, setActiveAdvantageId] = useState<string>(ADVANTAGES[0].id);
  const [focusedStepId, setFocusedStepId] = useState<ChecklistStepId | null>(null);
  const createSectionRef = useRef<HTMLDivElement>(null);

  const integrationsHref = application.getUrlForApp('integrations');

  const scrollToCreate = useCallback(() => {
    setActiveSection('setup');
    setFocusedStepId('create');
    // Defer until the setup main pane is painted.
    requestAnimationFrame(() => {
      createSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);

  const handleDataStep = useCallback(() => {
    if (signals.hasData) {
      setFocusedStepId('create');
      return;
    }
    const locator = share.url.locators.get<ObservabilityOnboardingLocatorParams>(
      OBSERVABILITY_ONBOARDING_LOCATOR
    );
    onClose();
    if (locator) {
      void locator.navigate({});
      return;
    }
    void application.navigateToApp('observabilityOnboarding');
  }, [application, onClose, share.url.locators, signals.hasData]);

  const handleCreateStep = useCallback(() => {
    scrollToCreate();
  }, [scrollToCreate]);

  const checklistActions = useMemo(
    () =>
      ({
        data: handleDataStep,
        create: handleCreateStep,
      }) satisfies Partial<Record<ChecklistStepId, () => void>>,
    [handleCreateStep, handleDataStep]
  );

  const checklist = useMemo<ChecklistItem[]>(() => {
    return [
      {
        id: 'data',
        title: signals.hasData
          ? i18n.translate('xpack.alertingV2.rulesList.onboardingModal.checklist.data.ready', {
              defaultMessage: 'Data is available',
            })
          : i18n.translate('xpack.alertingV2.rulesList.onboardingModal.checklist.data.missing', {
              defaultMessage: 'Add data',
            }),
        description: signals.hasData
          ? undefined
          : i18n.translate(
              'xpack.alertingV2.rulesList.onboardingModal.checklist.data.missingDescription',
              {
                defaultMessage:
                  'Ingest data with Observability onboarding, then come back to create a Universal rule.',
              }
            ),
        complete: signals.hasData,
        compact: signals.hasData,
        actionLabel: signals.hasData
          ? undefined
          : i18n.translate('xpack.alertingV2.rulesList.onboardingModal.checklist.data.addData', {
              defaultMessage: 'Add data',
            }),
      },
      {
        id: 'classic',
        // Status check only — used later to gate a migration path.
        title: signals.hasClassicRules
          ? i18n.translate(
              'xpack.alertingV2.rulesList.onboardingModal.checklist.classic.hasRules',
              {
                defaultMessage: 'Classic rules',
              }
            )
          : i18n.translate(
              'xpack.alertingV2.rulesList.onboardingModal.checklist.classic.noRules',
              {
                defaultMessage: 'No Classic rules',
              }
            ),
        complete: true,
        compact: true,
      },
      {
        id: 'create',
        title: i18n.translate('xpack.alertingV2.rulesList.onboardingModal.checklist.create.title', {
          defaultMessage: 'Start with Kibana Universal Alerting',
        }),
        description: i18n.translate(
          'xpack.alertingV2.rulesList.onboardingModal.checklist.create.description',
          {
            defaultMessage: 'Create a Universal rule and set up notifications.',
          }
        ),
        complete: false,
        actionLabel: i18n.translate(
          'xpack.alertingV2.rulesList.onboardingModal.checklist.create.action',
          {
            defaultMessage: 'Get started',
          }
        ),
      },
    ];
  }, [signals]);

  const completedCount = checklist.filter((item) => item.complete).length;
  const totalCount = checklist.length;
  const readyToCreate = signals.hasData && !signals.isLoading;

  const handleChooseThreshold = () => {
    onClose();
    onCreateThresholdRule();
  };

  const handleChooseEsql = () => {
    onClose();
    onCreateEsqlRule();
  };

  const handleChooseAgent = (userInput?: string) => {
    onClose();
    onCreateWithAgent(userInput);
  };

  const handleChooseSequence = () => {
    onClose();
    onBuildSequence();
  };

  const handleBrowseClassic = (search?: string) => {
    onClose();
    onBrowseClassic(search);
  };

  const handleCreateActionPolicy = () => {
    onClose();
    onCreateActionPolicy();
  };

  const setupSteps = useMemo(() => {
    let foundCurrent = false;
    return checklist.map((item) => {
      let status: EuiStepStatus;
      if (item.complete) {
        status = 'complete';
      } else if (!foundCurrent) {
        status = 'current';
        foundCurrent = true;
      } else {
        status = 'incomplete';
      }
      if (focusedStepId === item.id && !item.complete) {
        status = 'current';
      }

      const action = checklistActions[item.id];
      const showBody = !item.compact && (item.description || (item.actionLabel && action));

      return {
        title: item.title,
        status,
        children: showBody ? (
          <div data-test-subj={`alertingOnboardingChecklistStep-${item.id}`}>
            {item.description ? (
              <EuiText size="s" color="subdued">
                <p>{item.description}</p>
              </EuiText>
            ) : null}
            {item.actionLabel && action ? (
              <>
                {item.description ? <EuiSpacer size="s" /> : null}
                <EuiButtonEmpty
                  size="xs"
                  flush="left"
                  onClick={action}
                  data-test-subj={`alertingOnboardingChecklistAction-${item.id}`}
                >
                  {item.actionLabel}
                </EuiButtonEmpty>
              </>
            ) : null}
          </div>
        ) : (
          <span data-test-subj={`alertingOnboardingChecklistStep-${item.id}`} />
        ),
      };
    });
  }, [checklist, checklistActions, focusedStepId]);

  const styles = useMemo(
    () => ({
      sidebarNav: css`
        display: flex;
        flex-direction: column;
        gap: ${euiTheme.size.s};
        flex: 1 1 auto;
        min-height: 0;
      `,
      /** Matches Version history list-item selected / default card chrome. */
      sidebarNavCard: (isActive: boolean, isExpanded: boolean) => css`
        margin: 0;
        padding: ${euiTheme.size.base};
        cursor: pointer;
        text-align: start;
        width: 100%;
        background-color: ${isExpanded
          ? euiTheme.colors.backgroundBaseSubdued
          : euiTheme.colors.backgroundBasePlain};
        border-color: ${isActive ? euiTheme.colors.borderBasePlain : undefined};

        &:hover {
          background-color: ${isExpanded
            ? euiTheme.colors.backgroundBaseSubdued
            : euiTheme.colors.backgroundBaseInteractiveHover};
        }

        &:focus {
          outline: none;
        }

        &:focus-visible {
          outline: ${euiTheme.focus.width} solid ${euiTheme.focus.color};
          outline-offset: ${euiTheme.focus.width};
        }

        ${isExpanded
          ? `
          cursor: default;
        `
          : ''}
      `,
      sidebarFooter: css`
        flex-shrink: 0;
        margin-block-start: auto;
        padding-block-start: ${euiTheme.size.m};
      `,
      advantageIcon: css`
        display: flex;
        align-items: center;
        justify-content: center;
        inline-size: ${euiTheme.size.xl};
        block-size: ${euiTheme.size.xl};
        flex-shrink: 0;
        color: ${euiTheme.colors.textParagraph};
      `,
      advantageCard: (isExpanded: boolean) => css`
        cursor: pointer;
        border-color: ${isExpanded ? euiTheme.colors.borderBaseStrong : undefined};
        background: ${euiTheme.colors.backgroundBasePlain};
        transition: border-color ${euiTheme.animation.fast} ease;

        &:hover {
          border-color: ${euiTheme.colors.borderBaseStrong};
        }
      `,
      advantageExpandedBody: css`
        margin-block-start: ${euiTheme.size.m};
        padding-block-start: ${euiTheme.size.m};
        border-block-start: ${euiTheme.border.thin};
      `,
      illustration: css`
        max-inline-size: 240px;
        inline-size: 100%;
        margin-inline: auto;
        display: block;
      `,
      queryPipelineCompact: css`
        text-align: start;
      `,
    }),
    [euiTheme]
  );

  const headerActions = !signals.hasData ? (
    <EuiButton
      href={integrationsHref}
      iconType="plusCircle"
      data-test-subj="alertingOnboardingModalAddData"
    >
      <FormattedMessage
        id="xpack.alertingV2.rulesList.onboardingModal.addData"
        defaultMessage="Add data"
      />
    </EuiButton>
  ) : undefined;

  const navItems: Array<{ id: OnboardingSection; label: string; testSubj: string }> = [
    {
      id: 'why',
      label: SECTION_TITLES.why,
      testSubj: 'alertingOnboardingNav-why',
    },
    {
      id: 'setup',
      label: SECTION_TITLES.setup,
      testSubj: 'alertingOnboardingNav-setup',
    },
  ];

  const setupChecklist = (
    <div data-test-subj="alertingOnboardingChecklist">
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h3>
              <FormattedMessage
                id="xpack.alertingV2.rulesList.onboardingModal.checklist.title"
                defaultMessage="Your setup"
              />
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {signals.isLoading ? (
            <EuiLoadingSpinner size="m" data-test-subj="alertingOnboardingSignalsLoading" />
          ) : (
            <EuiBadge
              color={completedCount === totalCount - 1 && readyToCreate ? 'success' : 'hollow'}
              data-test-subj="alertingOnboardingProgress"
            >
              <FormattedMessage
                id="xpack.alertingV2.rulesList.onboardingModal.checklist.progress"
                defaultMessage="{completed} of {total} ready"
                values={{ completed: completedCount, total: totalCount }}
              />
            </EuiBadge>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiSteps steps={setupSteps} titleSize="xxs" />
    </div>
  );

  const sidebar = (
    <>
      <nav
        css={styles.sidebarNav}
        aria-label={i18n.translate('xpack.alertingV2.rulesList.onboardingModal.navLabel', {
          defaultMessage: 'Get started sections',
        })}
        data-test-subj="alertingOnboardingNav"
      >
        {navItems.map((item) => {
          const isActive = activeSection === item.id;
          const isExpandedSetup = item.id === 'setup' && isActive;
          return (
            <EuiPanel
              key={item.id}
              element={isExpandedSetup ? 'div' : 'button'}
              hasBorder
              hasShadow={false}
              grow={false}
              paddingSize="none"
              aria-pressed={isExpandedSetup ? undefined : isActive}
              onClick={isExpandedSetup ? undefined : () => setActiveSection(item.id)}
              data-test-subj={item.testSubj}
              data-selected={isActive ? true : undefined}
              css={styles.sidebarNavCard(isActive, isExpandedSetup)}
            >
              {isExpandedSetup ? (
                setupChecklist
              ) : (
                <EuiText size="xs">
                  <strong
                    css={css`
                      font-weight: ${euiTheme.font.weight.semiBold};
                      color: ${euiTheme.colors.textHeading};
                    `}
                  >
                    {item.label}
                  </strong>
                </EuiText>
              )}
            </EuiPanel>
          );
        })}
      </nav>

      <div css={styles.sidebarFooter}>
        <EuiText size="s" color="subdued">
          <p>
            <FormattedMessage
              id="xpack.alertingV2.rulesList.onboardingModal.docsPrompt"
              defaultMessage="Want the deep dive? {docsLink}"
              values={{
                docsLink: (
                  <a href={documentationHref} target="_blank" rel="noopener noreferrer">
                    <FormattedMessage
                      id="xpack.alertingV2.rulesList.onboardingModal.docsLink"
                      defaultMessage="Read the guide"
                    />
                  </a>
                ),
              }}
            />
          </p>
        </EuiText>
      </div>
    </>
  );

  const setupContent = (
    <div ref={createSectionRef} data-test-subj="alertingOnboardingCreateSection">
      <EuiTitle size="xs">
        <h2>
          <FormattedMessage
            id="xpack.alertingV2.rulesList.onboardingModal.create.title"
            defaultMessage="Start with Kibana Universal Alerting"
          />
        </h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        <p>
          <FormattedMessage
            id="xpack.alertingV2.rulesList.onboardingModal.create.intro"
            defaultMessage="Create a Universal rule, then set up notifications with an action policy."
          />
        </p>
      </EuiText>
      <EuiSpacer size="l" />

      <EuiTitle size="xxs">
        <h3>
          <FormattedMessage
            id="xpack.alertingV2.rulesList.onboardingModal.create.ruleSectionTitle"
            defaultMessage="Create a rule"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        <p>
          <FormattedMessage
            id="xpack.alertingV2.rulesList.onboardingModal.create.ruleSectionIntro"
            defaultMessage="Search what you want to measure — we’ll suggest Threshold or ES|QL, or send you to Classic when that domain fits better."
          />
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiPanel hasBorder paddingSize="m">
        <OnboardingMeasureCreateSection
          onChooseThreshold={handleChooseThreshold}
          onChooseEsql={handleChooseEsql}
          onChooseAgent={handleChooseAgent}
          onChooseSequence={handleChooseSequence}
          onBrowseClassic={handleBrowseClassic}
          showClassic={showClassic}
        />
      </EuiPanel>

      <EuiSpacer size="xl" />

      <EuiTitle size="xxs">
        <h3>
          <FormattedMessage
            id="xpack.alertingV2.rulesList.onboardingModal.create.notificationSectionTitle"
            defaultMessage="Create notifications"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        <p>
          <FormattedMessage
            id="xpack.alertingV2.rulesList.onboardingModal.create.notificationSectionIntro"
            defaultMessage="Action policies route alerts to Slack, email, and other connectors — shared across many rules."
          />
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiPanel
        element="button"
        hasBorder
        paddingSize="m"
        onClick={handleCreateActionPolicy}
        data-test-subj="alertingOnboardingCreateActionPolicy"
        css={css`
          text-align: start;
          cursor: pointer;
          width: 100%;
        `}
      >
        <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="bell" size="l" color="text" aria-hidden />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">
              <strong>
                <FormattedMessage
                  id="xpack.alertingV2.rulesList.onboardingModal.create.actionPolicyTitle"
                  defaultMessage="Create action policy"
                />
              </strong>
            </EuiText>
            <EuiText size="xs" color="subdued">
              <FormattedMessage
                id="xpack.alertingV2.rulesList.onboardingModal.create.actionPolicyDescription"
                defaultMessage="Define matchers, destinations, and throttling in one place."
              />
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiIcon type="arrowRight" color="subdued" aria-hidden />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </div>
  );

  const whyContent = (
    <div data-test-subj="alertingOnboardingAdvantages">
      <EuiText size="s" color="subdued">
        <p>
          <FormattedMessage
            id="xpack.alertingV2.rulesList.onboardingModal.intro"
            defaultMessage="Universal Alerting lets you write alert rules as ES|QL queries or with a threshold builder, control how alerts behave, and route notifications with action policies — alongside Classic, with nothing to migrate."
          />
        </p>
      </EuiText>
      <EuiSpacer size="m" />

      <EuiFlexGroup direction="column" gutterSize="s">
        {ADVANTAGES.map((item) => {
          const isExpanded = item.id === activeAdvantageId;
          return (
            <EuiFlexItem key={item.id} grow={false}>
              <EuiPanel
                hasBorder
                paddingSize="m"
                element="button"
                onClick={() =>
                  setActiveAdvantageId((current) => (current === item.id ? '' : item.id))
                }
                css={styles.advantageCard(isExpanded)}
                aria-expanded={isExpanded}
                data-test-subj={`alertingOnboardingAdvantage-${item.id}`}
                data-expanded={isExpanded ? true : undefined}
              >
                <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <span css={styles.advantageIcon}>
                      <EuiIcon type={item.icon} />
                    </span>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiFlexGroup
                      gutterSize="s"
                      alignItems="center"
                      justifyContent="spaceBetween"
                      responsive={false}
                    >
                      <EuiFlexItem>
                        <EuiTitle size="xxs">
                          <h3>{item.title}</h3>
                        </EuiTitle>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiIcon
                          type={isExpanded ? 'chevronSingleDown' : 'chevronSingleRight'}
                          size="s"
                          color="subdued"
                          aria-hidden
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                    <EuiSpacer size="xs" />
                    <EuiText size="s" color="subdued">
                      <p>{item.description}</p>
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
                {isExpanded ? (
                  <div
                    css={styles.advantageExpandedBody}
                    data-test-subj="alertingOnboardingAdvantageExpanded"
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                    role="presentation"
                  >
                    {item.expandedDemo === 'queryPipeline' ? (
                      <div
                        css={styles.queryPipelineCompact}
                        data-test-subj="alertingOnboardingQueryPipeline"
                      >
                        <QueryPipelineExplainer demo forceExpanded layout="split" />
                      </div>
                    ) : item.expandedDemo === 'alertAsDataYouControl' ? (
                      <OnboardingAdvantageSelectorPanel
                        cards={ALERT_AS_DATA_YOU_CONTROL_CARDS}
                        testSubj="alertingOnboardingAlertAsData"
                        cardTestSubjPrefix="alertingOnboardingAlertAsDataCard"
                        intro={
                          <FormattedMessage
                            id="xpack.alertingV2.rulesList.onboardingModal.advantages.alertAsData.panelIntro"
                            defaultMessage="You define how each alert looks and behaves — then treat those alerts as first-class data you can search, visualize, and triage."
                          />
                        }
                      />
                    ) : item.illustration && item.illustrationAlt ? (
                      <EuiIllustration
                        type={item.illustration}
                        alt={item.illustrationAlt}
                        css={styles.illustration}
                      />
                    ) : null}
                  </div>
                ) : null}
              </EuiPanel>
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>

      <EuiSpacer size="xl" />

      <div data-test-subj="alertingOnboardingCompareSection">
        <EuiTitle size="xs">
          <h2>
            <FormattedMessage
              id="xpack.alertingV2.rulesList.onboardingModal.section.compare.title"
              defaultMessage="Universal vs Classic"
            />
          </h2>
        </EuiTitle>
        <EuiSpacer size="m" />
        <EuiFlexGroup gutterSize="m">
          <EuiFlexItem>
            <EuiPanel
              hasBorder
              paddingSize="m"
              color="success"
              data-test-subj="alertingOnboardingWhenUniversal"
            >
              <EuiTitle size="xxs">
                <h3>
                  <FormattedMessage
                    id="xpack.alertingV2.rulesList.onboardingModal.whenToUse.universal.title"
                    defaultMessage="Prefer Universal when"
                  />
                </h3>
              </EuiTitle>
              <EuiSpacer size="s" />
              <EuiText size="s">
                <ul>
                  <li>
                    <FormattedMessage
                      id="xpack.alertingV2.rulesList.onboardingModal.whenToUse.universal.beyondParams"
                      defaultMessage="The condition goes beyond a Classic rule type’s parameters"
                    />
                  </li>
                  <li>
                    <FormattedMessage
                      id="xpack.alertingV2.rulesList.onboardingModal.whenToUse.universal.fields"
                      defaultMessage="You need custom fields, severity, or grouping on the alert"
                    />
                  </li>
                  <li>
                    <FormattedMessage
                      id="xpack.alertingV2.rulesList.onboardingModal.whenToUse.universal.policies"
                      defaultMessage="You want shared action policies across many rules"
                    />
                  </li>
                </ul>
              </EuiText>
            </EuiPanel>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiPanel
              hasBorder
              paddingSize="m"
              color="plain"
              data-test-subj="alertingOnboardingWhenClassic"
            >
              <EuiTitle size="xxs">
                <h3>
                  <FormattedMessage
                    id="xpack.alertingV2.rulesList.onboardingModal.whenToUse.classic.title"
                    defaultMessage="Prefer Classic when"
                  />
                </h3>
              </EuiTitle>
              <EuiSpacer size="s" />
              <EuiText size="s">
                <ul>
                  <li>
                    <FormattedMessage
                      id="xpack.alertingV2.rulesList.onboardingModal.whenToUse.classic.ruleType"
                      defaultMessage="A built-in rule type already matches your scenario"
                    />
                  </li>
                  <li>
                    <FormattedMessage
                      id="xpack.alertingV2.rulesList.onboardingModal.whenToUse.classic.guided"
                      defaultMessage="You want guided parameters and a fixed alert shape"
                    />
                  </li>
                  <li>
                    <FormattedMessage
                      id="xpack.alertingV2.rulesList.onboardingModal.whenToUse.classic.actions"
                      defaultMessage="Actions attached on the rule are enough"
                    />
                  </li>
                </ul>
              </EuiText>
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </div>
  );

  const mainContent = activeSection === 'setup' ? setupContent : whyContent;

  return (
    <FullscreenPageModal
      title={SECTION_TITLES[activeSection]}
      backLabel={i18n.translate('xpack.alertingV2.rulesList.onboardingModal.back', {
        defaultMessage: 'Back',
      })}
      onClose={onClose}
      data-test-subj="alertingOnboardingModal"
      headerActions={headerActions}
      sidebarTitle={i18n.translate('xpack.alertingV2.rulesList.onboardingModal.sidebarTitle', {
        defaultMessage: 'Get started',
      })}
      sidebar={sidebar}
      sidebarSide="end"
    >
      {mainContent}
    </FullscreenPageModal>
  );
};
