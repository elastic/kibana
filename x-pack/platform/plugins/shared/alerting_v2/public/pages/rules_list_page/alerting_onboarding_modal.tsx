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
  EuiCallOut,
  EuiCodeBlock,
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
import {
  caseManagement,
  communication,
  discovery,
  fieldExtraction,
} from '@elastic/eui-illustrations';
import type { EuiIllustrationSource } from '@elastic/eui-illustrations';
import { css } from '@emotion/react';
import { PluginStart } from '@kbn/core-di';
import { CoreStart, useService } from '@kbn/core-di-browser';
import {
  OBSERVABILITY_ONBOARDING_LOCATOR,
  type ObservabilityOnboardingLocatorParams,
} from '@kbn/deeplinks-observability';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { esqlRulesIllustration } from '../../assets/esql_rules_illustration';
import { FullscreenPageModal } from '../../components/fullscreen_page_modal/fullscreen_page_modal';
import { QueryPipelineExplainer } from '@kbn/alerting-v2-rule-form';
import { OnboardingLifecycleTimelineDemo } from './onboarding_lifecycle_timeline_demo';
import { OnboardingMeasureCreateSection } from './onboarding_measure_create_section';
import {
  type OnboardingSignals,
  useOnboardingSignals,
} from './use_onboarding_signals';

const SAMPLE_ESQL_QUERY = `FROM metrics-*
| WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend
| WHERE system.cpu.total.norm.pct IS NOT NULL
| STATS
    avg_cpu_pct = ROUND(AVG(system.cpu.total.norm.pct) * 100, 0),
    samples = COUNT(*)
  BY host.name, cloud.availability_zone
| EVAL severity = CASE(avg_cpu_pct > 95, "critical", avg_cpu_pct > 90, "high", avg_cpu_pct > 85, "medium")
| WHERE samples >= 10 AND severity IS NOT NULL
| KEEP host.name, cloud.availability_zone, avg_cpu_pct, severity, samples`;

export interface AlertingOnboardingModalProps {
  onClose: () => void;
  onCreateEsqlRule: () => void;
  onCreateThresholdRule: () => void;
  onCreateWithAgent: (userInput?: string) => void;
  onBuildSequence: () => void;
  onBrowseClassic: (search?: string) => void;
  documentationHref: string;
  /** When false, Classic-only domains still show Universal create paths. */
  showClassic?: boolean;
  /** Test / host overrides for personalization signals. */
  signalsOverride?: OnboardingSignals;
}

const ADVANTAGES: Array<{
  id: string;
  icon: 'search' | 'controls' | 'clock' | 'bell' | 'database' | 'list';
  title: string;
  description: string;
  illustration?: EuiIllustrationSource;
  illustrationAlt?: string;
  sampleQuery?: string;
  /** Interactive demo instead of a static illustration. */
  expandedDemo?: 'lifecycleTimeline';
}> = [
  {
    id: 'query',
    icon: 'search',
    title: i18n.translate('xpack.alertingV2.rulesList.onboardingModal.advantages.query.title', {
      defaultMessage: 'Any condition you can query',
    }),
    description: i18n.translate(
      'xpack.alertingV2.rulesList.onboardingModal.advantages.query.description',
      {
        defaultMessage:
          'Write an ES|QL rule or use the threshold builder — you are not limited to a fixed rule-type form.',
      }
    ),
    illustration: esqlRulesIllustration,
    illustrationAlt: i18n.translate(
      'xpack.alertingV2.rulesList.onboardingModal.advantages.query.illustrationAlt',
      { defaultMessage: 'Illustration of writing a query-based alert rule' }
    ),
    sampleQuery: SAMPLE_ESQL_QUERY,
  },
  {
    id: 'shape',
    icon: 'controls',
    title: i18n.translate('xpack.alertingV2.rulesList.onboardingModal.advantages.shape.title', {
      defaultMessage: 'You shape the alert',
    }),
    description: i18n.translate(
      'xpack.alertingV2.rulesList.onboardingModal.advantages.shape.description',
      {
        defaultMessage: 'Returned fields, severity, and grouping are yours to define.',
      }
    ),
    illustration: fieldExtraction,
    illustrationAlt: i18n.translate(
      'xpack.alertingV2.rulesList.onboardingModal.advantages.shape.illustrationAlt',
      { defaultMessage: 'Illustration of shaping alert fields' }
    ),
  },
  {
    id: 'lifecycle',
    icon: 'clock',
    title: i18n.translate('xpack.alertingV2.rulesList.onboardingModal.advantages.lifecycle.title', {
      defaultMessage: 'Lifecycle you control',
    }),
    description: i18n.translate(
      'xpack.alertingV2.rulesList.onboardingModal.advantages.lifecycle.description',
      {
        defaultMessage:
          'Tune alert delay, recovery, and no-data behavior so brief spikes do not flap.',
      }
    ),
    expandedDemo: 'lifecycleTimeline',
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
  {
    id: 'data',
    icon: 'database',
    title: i18n.translate('xpack.alertingV2.rulesList.onboardingModal.advantages.data.title', {
      defaultMessage: 'Alerts are data',
    }),
    description: i18n.translate(
      'xpack.alertingV2.rulesList.onboardingModal.advantages.data.description',
      {
        defaultMessage: 'Search them in Discover, build dashboards, or write rules on top of them.',
      }
    ),
    illustration: discovery,
    illustrationAlt: i18n.translate(
      'xpack.alertingV2.rulesList.onboardingModal.advantages.data.illustrationAlt',
      { defaultMessage: 'Illustration of exploring alerts as data' }
    ),
  },
  {
    id: 'inbox',
    icon: 'list',
    title: i18n.translate('xpack.alertingV2.rulesList.onboardingModal.advantages.inbox.title', {
      defaultMessage: 'One place to triage',
    }),
    description: i18n.translate(
      'xpack.alertingV2.rulesList.onboardingModal.advantages.inbox.description',
      {
        defaultMessage:
          'Universal and Classic alerts share an inbox. Nothing has to migrate to get started.',
      }
    ),
    illustration: caseManagement,
    illustrationAlt: i18n.translate(
      'xpack.alertingV2.rulesList.onboardingModal.advantages.inbox.illustrationAlt',
      { defaultMessage: 'Illustration of a shared alerts inbox' }
    ),
  },
];

type ChecklistStepId = 'data' | 'classic' | 'create';

interface ChecklistItem {
  id: ChecklistStepId;
  title: string;
  description: string;
  complete: boolean;
  actionLabel: string;
}

type OnboardingSection = 'setup' | 'why' | 'query';

const SECTION_TITLES: Record<OnboardingSection, string> = {
  setup: i18n.translate('xpack.alertingV2.rulesList.onboardingModal.section.setup.title', {
    defaultMessage: 'Get started — your setup',
  }),
  why: i18n.translate('xpack.alertingV2.rulesList.onboardingModal.section.why.title', {
    defaultMessage: 'Why Universal Alerting',
  }),
  query: i18n.translate('xpack.alertingV2.rulesList.onboardingModal.section.query.title', {
    defaultMessage: 'Query power',
  }),
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
  documentationHref,
  showClassic = true,
  signalsOverride,
}: AlertingOnboardingModalProps): JSX.Element => {
  const { euiTheme } = useEuiTheme();
  const application = useService(CoreStart('application'));
  const share = useService(PluginStart('share')) as SharePluginStart;
  const liveSignals = useOnboardingSignals();
  const signals = signalsOverride ?? liveSignals;
  const [activeSection, setActiveSection] = useState<OnboardingSection>('setup');
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
      setFocusedStepId('classic');
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

  const handleRulesStep = useCallback(() => {
    if (signals.hasClassicRules) {
      // Migration guidance lives on Why Universal until a dedicated entry point ships.
      setActiveSection('why');
      setFocusedStepId('classic');
      return;
    }
    scrollToCreate();
  }, [scrollToCreate, signals.hasClassicRules]);

  const handleCreateStep = useCallback(() => {
    scrollToCreate();
  }, [scrollToCreate]);

  const checklistActions = useMemo(
    () =>
      ({
        data: handleDataStep,
        classic: handleRulesStep,
        create: handleCreateStep,
      }) satisfies Record<ChecklistStepId, () => void>,
    [handleCreateStep, handleDataStep, handleRulesStep]
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
          ? i18n.translate(
              'xpack.alertingV2.rulesList.onboardingModal.checklist.data.readyDescription',
              {
                defaultMessage:
                  'We found data views in this space — continue to review rules, then create your first Universal rule.',
              }
            )
          : i18n.translate(
              'xpack.alertingV2.rulesList.onboardingModal.checklist.data.missingDescription',
              {
                defaultMessage:
                  'Ingest data with Observability onboarding, then come back to create a Universal rule.',
              }
            ),
        complete: signals.hasData,
        actionLabel: signals.hasData
          ? i18n.translate('xpack.alertingV2.rulesList.onboardingModal.checklist.data.continue', {
              defaultMessage: 'Continue',
            })
          : i18n.translate('xpack.alertingV2.rulesList.onboardingModal.checklist.data.addData', {
              defaultMessage: 'Add data',
            }),
      },
      {
        id: 'classic',
        title: signals.hasClassicRules
          ? i18n.translate(
              'xpack.alertingV2.rulesList.onboardingModal.checklist.classic.hasRules',
              {
                defaultMessage: '{count, plural, one {# Classic rule} other {# Classic rules}}',
                values: { count: signals.classicRulesCount },
              }
            )
          : i18n.translate(
              'xpack.alertingV2.rulesList.onboardingModal.checklist.classic.noRules',
              {
                defaultMessage: 'No Classic rules yet',
              }
            ),
        description: signals.hasClassicRules
          ? i18n.translate(
              'xpack.alertingV2.rulesList.onboardingModal.checklist.classic.hasRulesDescription',
              {
                defaultMessage:
                  'Classic keeps running. Review when to prefer Universal, and watch for guided migration (coming soon).',
              }
            )
          : i18n.translate(
              'xpack.alertingV2.rulesList.onboardingModal.checklist.classic.noRulesDescription',
              {
                defaultMessage:
                  'A clean start — go to Universal Alerting to create your first rule.',
              }
            ),
        complete: true,
        actionLabel: signals.hasClassicRules
          ? i18n.translate(
              'xpack.alertingV2.rulesList.onboardingModal.checklist.classic.seeMigration',
              {
                defaultMessage: 'See Universal vs Classic',
              }
            )
          : i18n.translate(
              'xpack.alertingV2.rulesList.onboardingModal.checklist.classic.startUniversal',
              {
                defaultMessage: 'Start with Universal',
              }
            ),
      },
      {
        id: 'create',
        title: i18n.translate('xpack.alertingV2.rulesList.onboardingModal.checklist.create.title', {
          defaultMessage: 'Create your first Universal rule',
        }),
        description: i18n.translate(
          'xpack.alertingV2.rulesList.onboardingModal.checklist.create.description',
          {
            defaultMessage:
              'Use an ES|QL rule for full control, or the threshold builder for a guided start.',
          }
        ),
        complete: false,
        actionLabel: i18n.translate(
          'xpack.alertingV2.rulesList.onboardingModal.checklist.create.action',
          {
            defaultMessage: 'Create a rule',
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
      return {
        title: item.title,
        status,
        children: (
          <div data-test-subj={`alertingOnboardingChecklistStep-${item.id}`}>
            <EuiText size="s" color="subdued">
              <p>{item.description}</p>
            </EuiText>
            <EuiSpacer size="s" />
            <EuiButtonEmpty
              size="xs"
              flush="left"
              onClick={checklistActions[item.id]}
              data-test-subj={`alertingOnboardingChecklistAction-${item.id}`}
            >
              {item.actionLabel}
            </EuiButtonEmpty>
          </div>
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
        background-color: ${isActive
          ? euiTheme.colors.backgroundBasePlain
          : euiTheme.colors.backgroundBasePlain};
        border-color: ${isActive ? euiTheme.colors.borderBasePlain : undefined};

        &:hover {
          background-color: ${euiTheme.colors.backgroundBaseInteractiveHover};
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
          &:hover {
            background-color: ${euiTheme.colors.backgroundBasePlain};
          }
        `
          : ''}
      `,
      sidebarFooter: css`
        flex-shrink: 0;
        margin-block-start: auto;
        padding-block-start: ${euiTheme.size.m};
      `,
      queryCanvasShell: css`
        display: flex;
        flex-direction: column;
        flex: 1 1 auto;
        min-block-size: 0;
        block-size: 100%;
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
      sampleQuery: css`
        inline-size: 100%;
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
      id: 'setup',
      label: SECTION_TITLES.setup,
      testSubj: 'alertingOnboardingNav-setup',
    },
    {
      id: 'why',
      label: SECTION_TITLES.why,
      testSubj: 'alertingOnboardingNav-why',
    },
    {
      id: 'query',
      label: SECTION_TITLES.query,
      testSubj: 'alertingOnboardingNav-query',
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
            defaultMessage="Create a Universal rule"
          />
        </h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        <p>
          <FormattedMessage
            id="xpack.alertingV2.rulesList.onboardingModal.create.intro"
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
                    {item.sampleQuery ? (
                      <EuiCodeBlock
                        language="esql"
                        fontSize="s"
                        paddingSize="m"
                        overflowHeight={320}
                        isCopyable
                        css={styles.sampleQuery}
                        data-test-subj="alertingOnboardingSampleQuery"
                      >
                        {item.sampleQuery}
                      </EuiCodeBlock>
                    ) : item.expandedDemo === 'lifecycleTimeline' ? (
                      <OnboardingLifecycleTimelineDemo />
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

        <EuiSpacer size="l" />

        <EuiCallOut
          title={
            <>
              {i18n.translate('xpack.alertingV2.rulesList.onboardingModal.migration.title', {
                defaultMessage: 'Guided migration from Classic',
              })}{' '}
              <EuiBadge color="accent" data-test-subj="alertingOnboardingMigrationSoonBadge">
                <FormattedMessage
                  id="xpack.alertingV2.rulesList.onboardingModal.migration.comingSoonBadge"
                  defaultMessage="Coming soon"
                />
              </EuiBadge>
            </>
          }
          color="plain"
          iconType="clock"
          size="s"
          data-test-subj="alertingOnboardingMigrationSoon"
        >
          <p>
            <FormattedMessage
              id="xpack.alertingV2.rulesList.onboardingModal.migration.body"
              defaultMessage="Until then, recreate the rules you want more control over with ES|QL or the threshold builder. Classic rules keep running unchanged."
            />
          </p>
        </EuiCallOut>
      </div>
    </div>
  );

  const queryContent = (
    <div data-test-subj="alertingOnboardingQueryPipeline" css={styles.queryCanvasShell}>
      <EuiText size="s" color="subdued">
        <p>
          <FormattedMessage
            id="xpack.alertingV2.rulesList.onboardingModal.query.intro"
            defaultMessage="Universal runs a small query pipeline — base, alert, recovery, and an optional no-data check — from the intent you write once."
          />
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <QueryPipelineExplainer demo forceExpanded layout="canvas" />
    </div>
  );

  const mainContent =
    activeSection === 'setup'
      ? setupContent
      : activeSection === 'why'
      ? whyContent
      : queryContent;

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
