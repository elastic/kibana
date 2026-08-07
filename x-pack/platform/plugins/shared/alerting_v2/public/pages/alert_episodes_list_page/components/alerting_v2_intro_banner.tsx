/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { AnnouncementBanner } from '@kbn/announcement-banner';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import visibilityIllustration from '../../../assets/illustration-asset-visibility-128.png';
import esqlNativeRulesPreview from '../../../assets/esql-native-rules-preview.png';

export const ALERTING_V2_INTRO_BANNER_KEY = 'alertingV2.episodes.introBanner.dismissed';

const ALERTING_V2_DOCS_URL =
  'https://www.elastic.co/docs/explore-analyze/alerting/system-overview';

type FeatureId = 'esql' | 'authoring' | 'history' | 'recovery' | 'policies';

interface FeatureHighlight {
  id: FeatureId;
  title: string;
  navDescription: string;
  body: string;
  previewLabel: string;
  previewImage?: string;
}

const FEATURES: FeatureHighlight[] = [
  {
    id: 'esql',
    title: i18n.translate('xpack.alertingV2.episodes.introModal.features.esql.title', {
      defaultMessage: 'ES|QL-native rules',
    }),
    navDescription: i18n.translate(
      'xpack.alertingV2.episodes.introModal.features.esql.navDescription',
      {
        defaultMessage: 'ES|QL rule · open system · etc',
      }
    ),
    body: i18n.translate('xpack.alertingV2.episodes.introModal.features.esql.body', {
      defaultMessage:
        'Instead of choosing from fixed rule types with hard-coded executors, v2 rules are ES|QL queries. Thresholds, absence checks, aggregations, multi-condition logic — all expressed in the same query language you already use in Discover.',
    }),
    previewLabel: i18n.translate(
      'xpack.alertingV2.episodes.introModal.features.esql.previewLabel',
      {
        defaultMessage: 'Query sandbox with Create alert rule',
      }
    ),
    previewImage: esqlNativeRulesPreview,
  },
  {
    id: 'authoring',
    title: i18n.translate('xpack.alertingV2.episodes.introModal.features.authoring.title', {
      defaultMessage: 'Three authoring modes',
    }),
    navDescription: i18n.translate(
      'xpack.alertingV2.episodes.introModal.features.authoring.navDescription',
      {
        defaultMessage: 'ES|QL editor · visual rule builder · AI-assisted agent',
      }
    ),
    body: i18n.translate('xpack.alertingV2.episodes.introModal.features.authoring.body', {
      defaultMessage:
        'Choose the workflow that fits your expertise. Use the ES|QL editor for power, the visual builder for speed, or let the AI-assisted agent help you translate natural language into alerting logic.',
    }),
    previewLabel: i18n.translate(
      'xpack.alertingV2.episodes.introModal.features.authoring.previewLabel',
      {
        defaultMessage: 'Editor · visual builder · agent',
      }
    ),
  },
  {
    id: 'history',
    title: i18n.translate('xpack.alertingV2.episodes.introModal.features.history.title', {
      defaultMessage: 'Full alert history',
    }),
    navDescription: i18n.translate(
      'xpack.alertingV2.episodes.introModal.features.history.navDescription',
      {
        defaultMessage: 'Immutable documents in .rule-events',
      }
    ),
    body: i18n.translate('xpack.alertingV2.episodes.introModal.features.history.body', {
      defaultMessage:
        'Every state change is captured as an immutable document in the .rule-events system index. That gives you a durable audit trail and long-term trend analysis across your alerting environment.',
    }),
    previewLabel: i18n.translate(
      'xpack.alertingV2.episodes.introModal.features.history.previewLabel',
      {
        defaultMessage: 'Alert history timeline',
      }
    ),
  },
  {
    id: 'recovery',
    title: i18n.translate('xpack.alertingV2.episodes.introModal.features.recovery.title', {
      defaultMessage: 'Custom recovery',
    }),
    navDescription: i18n.translate(
      'xpack.alertingV2.episodes.introModal.features.recovery.navDescription',
      {
        defaultMessage: 'Custom recovery and delayed state changes',
      }
    ),
    body: i18n.translate('xpack.alertingV2.episodes.introModal.features.recovery.body', {
      defaultMessage:
        'Define custom recovery conditions and delayed state-change windows to reduce flapping. Get notified when an issue is truly resolved — not every brief blip.',
    }),
    previewLabel: i18n.translate(
      'xpack.alertingV2.episodes.introModal.features.recovery.previewLabel',
      {
        defaultMessage: 'Recovery conditions',
      }
    ),
  },
  {
    id: 'policies',
    title: i18n.translate('xpack.alertingV2.episodes.introModal.features.policies.title', {
      defaultMessage: 'Action policies',
    }),
    navDescription: i18n.translate(
      'xpack.alertingV2.episodes.introModal.features.policies.navDescription',
      {
        defaultMessage: 'Notifications decoupled from rules',
      }
    ),
    body: i18n.translate('xpack.alertingV2.episodes.introModal.features.policies.body', {
      defaultMessage:
        'Manage notifications independently from rules. Define reusable routing — for example different teams by severity — and apply the same policy across many rules.',
    }),
    previewLabel: i18n.translate(
      'xpack.alertingV2.episodes.introModal.features.policies.previewLabel',
      {
        defaultMessage: 'Action policy routing',
      }
    ),
  },
];

const illustrationStyles = css`
  max-inline-size: 80px;
`;

const FeaturePreview = ({ label, image }: { label: string; image?: string }) => {
  const { euiTheme } = useEuiTheme();

  if (image) {
    return (
      <EuiImage
        size="fullWidth"
        alt={label}
        src={image}
        css={css`
          border-radius: ${euiTheme.border.radius.medium};
          border: ${euiTheme.border.thin};
          overflow: hidden;
        `}
        data-test-subj="alertingV2IntroFeaturePreviewImage"
      />
    );
  }

  return (
    <div
      css={css`
        border-radius: ${euiTheme.border.radius.medium};
        border: ${euiTheme.border.thin};
        background: ${euiTheme.colors.backgroundBaseSubdued};
        padding: ${euiTheme.size.m};
        min-block-size: 180px;
        display: flex;
        flex-direction: column;
        gap: ${euiTheme.size.s};
      `}
      aria-hidden
    >
      <div
        css={css`
          height: ${euiTheme.size.m};
          width: 55%;
          border-radius: ${euiTheme.border.radius.small};
          background: ${euiTheme.colors.backgroundBasePlain};
          border: ${euiTheme.border.thin};
        `}
      />
      <div
        css={css`
          flex: 1;
          display: grid;
          grid-template-columns: 1.4fr 1fr;
          gap: ${euiTheme.size.s};
          min-block-size: 120px;
        `}
      >
        <div
          css={css`
            border-radius: ${euiTheme.border.radius.small};
            background: ${euiTheme.colors.backgroundBasePlain};
            border: ${euiTheme.border.thin};
            display: flex;
            align-items: flex-end;
            gap: 6px;
            padding: ${euiTheme.size.s};
          `}
        >
          {[40, 70, 55, 85, 45, 65].map((height, index) => (
            <div
              key={index}
              css={css`
                flex: 1;
                height: ${height}%;
                border-radius: 2px 2px 0 0;
                background: ${euiTheme.colors.primary};
                opacity: ${0.35 + index * 0.08};
              `}
            />
          ))}
        </div>
        <div
          css={css`
            border-radius: ${euiTheme.border.radius.small};
            background: ${euiTheme.colors.backgroundBasePlain};
            border: ${euiTheme.border.thin};
            padding: ${euiTheme.size.s};
            display: flex;
            flex-direction: column;
            gap: ${euiTheme.size.xs};
          `}
        >
          <div
            css={css`
              height: ${euiTheme.size.s};
              width: 70%;
              border-radius: ${euiTheme.border.radius.small};
              background: ${euiTheme.colors.backgroundBaseSubdued};
            `}
          />
          <div
            css={css`
              height: ${euiTheme.size.xl};
              border-radius: ${euiTheme.border.radius.small};
              background: ${euiTheme.colors.backgroundBaseSubdued};
            `}
          />
          <div
            css={css`
              height: ${euiTheme.size.s};
              width: 50%;
              margin-top: auto;
              border-radius: ${euiTheme.border.radius.small};
              background: ${euiTheme.colors.primary};
              opacity: 0.5;
            `}
          />
        </div>
      </div>
      <EuiText size="xs" color="subdued">
        {label}
      </EuiText>
    </div>
  );
};

const AlertingV2IntroModal = ({ onClose }: { onClose: () => void }) => {
  const { euiTheme } = useEuiTheme();
  const {
    services: { application },
  } = useKibana();
  const [selectedId, setSelectedId] = useState<FeatureId>('esql');

  const selectedFeature = useMemo(
    () => FEATURES.find((feature) => feature.id === selectedId) ?? FEATURES[0],
    [selectedId]
  );

  const createRuleHref = application.getUrlForApp('observability-overview', {
    path: '/alerts/rules-hub',
  });

  return (
    <EuiModal
      onClose={onClose}
      data-test-subj="alertingV2IntroModal"
      css={css`
        width: min(920px, 92vw);
        max-width: 920px;
      `}
    >
      <EuiModalHeader
        css={css`
          display: block;
          padding-block-end: ${euiTheme.size.m};
        `}
      >
        <EuiModalHeaderTitle size="m">
          {i18n.translate('xpack.alertingV2.episodes.introModal.title', {
            defaultMessage: 'Introducing Alerting v2',
          })}
        </EuiModalHeaderTitle>
        <EuiSpacer size="s" />
        <EuiText color="subdued">
          <p>
            {i18n.translate('xpack.alertingV2.episodes.introModal.subtitle', {
              defaultMessage:
                "Alerting v2 is a ground-up redesign of alerting in Kibana, built on ES|QL and it's now available!",
            })}
          </p>
        </EuiText>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiFlexGroup gutterSize="l" responsive={false} alignItems="stretch">
          <EuiFlexItem
            grow={false}
            css={css`
              width: 280px;
              border-right: ${euiTheme.border.thin};
              padding-right: ${euiTheme.size.l};
            `}
          >
            <EuiFlexGroup
              direction="column"
              gutterSize="s"
              role="tablist"
              aria-label={i18n.translate(
                'xpack.alertingV2.episodes.introModal.featureListAriaLabel',
                {
                  defaultMessage: 'Alerting v2 highlights',
                }
              )}
            >
              {FEATURES.map((feature) => {
                const isSelected = feature.id === selectedId;
                return (
                  <EuiFlexItem key={feature.id} grow={false}>
                    <EuiPanel
                      element="button"
                      paddingSize="m"
                      hasBorder={false}
                      hasShadow={isSelected}
                      color={isSelected ? 'plain' : 'transparent'}
                      onClick={() => setSelectedId(feature.id)}
                      role="tab"
                      aria-selected={isSelected}
                      data-test-subj={`alertingV2IntroFeature-${feature.id}`}
                      css={css`
                        text-align: start;
                        cursor: pointer;
                        background: ${isSelected
                          ? euiTheme.colors.backgroundBasePlain
                          : 'transparent'};

                        &:hover {
                          background: ${isSelected
                            ? euiTheme.colors.backgroundBasePlain
                            : euiTheme.colors.backgroundBaseSubdued};
                        }
                      `}
                    >
                      <EuiTitle size="xxs">
                        <h3>{feature.title}</h3>
                      </EuiTitle>
                      <EuiSpacer size="xs" />
                      <EuiText size="xs" color="subdued">
                        <p>{feature.navDescription}</p>
                      </EuiText>
                    </EuiPanel>
                  </EuiFlexItem>
                );
              })}
            </EuiFlexGroup>
          </EuiFlexItem>

          <EuiFlexItem
            role="tabpanel"
            data-test-subj={`alertingV2IntroFeaturePanel-${selectedFeature.id}`}
          >
            <EuiTitle size="xs">
              <h3>{selectedFeature.title}</h3>
            </EuiTitle>
            <EuiSpacer size="m" />
            <FeaturePreview
              label={selectedFeature.previewLabel}
              image={selectedFeature.previewImage}
            />
            <EuiSpacer size="m" />
            <EuiText size="s" color="subdued">
              <p>{selectedFeature.body}</p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiFlexGroup justifyContent="flexEnd" alignItems="center" gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              href={ALERTING_V2_DOCS_URL}
              target="_blank"
              iconType="popout"
              iconSide="right"
              data-test-subj="alertingV2IntroDocumentation"
            >
              {i18n.translate('xpack.alertingV2.episodes.introModal.documentation', {
                defaultMessage: 'Documentation',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              href={createRuleHref}
              onClick={onClose}
              data-test-subj="alertingV2IntroCreateRule"
            >
              {i18n.translate('xpack.alertingV2.episodes.introModal.createRule', {
                defaultMessage: 'Create new rule',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
};

/**
 * POC announcement for the merged Alerting IA Inbox (Alert episodes page).
 * Banner actions open the Introducing Alerting v2 feature modal.
 */
export function AlertingV2IntroBanner() {
  const [isDismissed, setIsDismissed] = useLocalStorage(ALERTING_V2_INTRO_BANNER_KEY, false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (isDismissed) {
    return null;
  }

  return (
    <>
      <AnnouncementBanner
        data-test-subj="alertingV2IntroAnnouncementBanner"
        title={i18n.translate('xpack.alertingV2.episodes.introBanner.title', {
          defaultMessage: 'Introducing Alerting v2',
        })}
        headingElement="h2"
        size="m"
        color="primary"
        text={i18n.translate('xpack.alertingV2.episodes.introBanner.text', {
          defaultMessage:
            "Alerting v2 is a ground-up redesign of alerting in Kibana, built on ES|QL and it's now available!",
        })}
        media={
          <EuiImage
            size="original"
            alt=""
            aria-hidden
            src={visibilityIllustration}
            css={illustrationStyles}
            data-test-subj="alertingV2IntroIllustration"
          />
        }
        onDismiss={() => setIsDismissed(true)}
        actionProps={{
          primary: {
            children: i18n.translate('xpack.alertingV2.episodes.introBanner.whyV2', {
              defaultMessage: 'Why Alerting v2',
            }),
            onClick: () => setIsModalOpen(true),
            fill: true,
            'data-test-subj': 'alertingV2IntroWhyButton',
          },
          secondary: {
            children: i18n.translate('xpack.alertingV2.episodes.introBanner.learnMore', {
              defaultMessage: 'Learn more',
            }),
            href: ALERTING_V2_DOCS_URL,
            target: '_blank',
            iconType: 'popout',
            iconSide: 'right',
            'data-test-subj': 'alertingV2IntroLearnMoreButton',
          },
        }}
      />
      <EuiSpacer size="m" />

      {isModalOpen ? <AlertingV2IntroModal onClose={() => setIsModalOpen(false)} /> : null}
    </>
  );
}
