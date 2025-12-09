/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useEffect, useState } from 'react';
import {
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  EuiDescriptionList,
  useEuiTheme,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiLoadingSpinner,
  euiFontSize,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import type { TemplateDeserialized } from '@kbn/index-management-plugin/common/types';
import {
  formatDataRetention,
  getPhaseDescriptions,
  type IlmPolicyFetcher,
  type PhaseDescription,
} from '../../../../utils';

interface ConfirmTemplateDetailsSectionProps {
  template: TemplateDeserialized;
  getIlmPolicy?: IlmPolicyFetcher;
}

export const ConfirmTemplateDetailsSection = ({
  template,
  getIlmPolicy,
}: ConfirmTemplateDetailsSectionProps) => {
  const euiThemeContext = useEuiTheme();
  const { euiTheme } = euiThemeContext;

  const [ilmPhases, setIlmPhases] = useState<PhaseDescription[] | null>(null);
  const [isLoadingIlmPolicy, setIsLoadingIlmPolicy] = useState(false);

  const ilmPolicyName = template.ilmPolicy?.name;

  const phaseColors = useMemo(
    () => ({
      hot: euiTheme.colors.vis.euiColorVis6,
      warm: euiTheme.colors.vis.euiColorVis9,
      cold: euiTheme.colors.vis.euiColorVis2,
      frozen: euiTheme.colors.vis.euiColorVis4,
    }),
    [euiTheme]
  );

  // Fetch ILM policy details when policy name is available
  useEffect(() => {
    if (!ilmPolicyName || !getIlmPolicy) {
      setIlmPhases(null);
      return;
    }

    const abortController = new AbortController();
    setIsLoadingIlmPolicy(true);

    getIlmPolicy(ilmPolicyName, abortController.signal)
      .then((policy) => {
        if (!abortController.signal.aborted && policy) {
          const phases = getPhaseDescriptions(policy.policy.phases, phaseColors);
          setIlmPhases(phases);
        }
      })
      .catch((error) => {
        // Silently fail - we'll just not show phases
        if (!abortController.signal.aborted) {
          setIlmPhases(null);
        }
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setIsLoadingIlmPolicy(false);
        }
      });

    return () => {
      abortController.abort();
    };
  }, [ilmPolicyName, getIlmPolicy, phaseColors]);

  const templateDetails = useMemo(() => {
    const indexMode = template.indexMode ?? 'standard';
    const dataRetention = formatDataRetention(template);
    const componentTemplates = template.composedOf ?? [];

    const items: Array<{ title: string; description: React.ReactNode }> = [];

    // Version
    if (template.version !== undefined) {
      items.push({
        title: i18n.translate('xpack.createClassicStreamFlyout.nameAndConfirmStep.versionLabel', {
          defaultMessage: 'Version',
        }),
        description: String(template.version),
      });
    }

    // Index mode
    items.push({
      title: i18n.translate('xpack.createClassicStreamFlyout.nameAndConfirmStep.indexModeLabel', {
        defaultMessage: 'Index mode',
      }),
      description: indexMode.charAt(0).toUpperCase() + indexMode.slice(1),
    });

    // Retention - ILM policy or data retention
    if (ilmPolicyName) {
      items.push({
        title: i18n.translate('xpack.createClassicStreamFlyout.nameAndConfirmStep.retentionLabel', {
          defaultMessage: 'Retention',
        }),
        description: (
          <EuiFlexGroup direction="column" gutterSize="xs" alignItems="flexStart">
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>{ilmPolicyName}</EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">
                    {i18n.translate(
                      'xpack.createClassicStreamFlyout.nameAndConfirmStep.ilmBadgeLabel',
                      {
                        defaultMessage: 'ILM',
                      }
                    )}
                  </EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            {isLoadingIlmPolicy && (
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="s" />
              </EuiFlexItem>
            )}
            {ilmPhases && ilmPhases.length > 0 && (
              <EuiFlexItem grow={false}>
                <EuiFlexGroup
                  gutterSize="s"
                  alignItems="center"
                  direction="row"
                  responsive={false}
                  wrap
                >
                  {ilmPhases.map((phase, idx) => (
                    <EuiFlexItem key={idx} grow={false}>
                      <EuiHealth textSize="xs" color={phase.color}>
                        {phase.description}
                      </EuiHealth>
                    </EuiFlexItem>
                  ))}
                </EuiFlexGroup>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        ),
      });
    } else if (dataRetention) {
      items.push({
        title: i18n.translate('xpack.createClassicStreamFlyout.nameAndConfirmStep.retentionLabel', {
          defaultMessage: 'Retention',
        }),
        description: dataRetention,
      });
    }

    // Component templates
    if (componentTemplates.length > 0) {
      items.push({
        title: i18n.translate(
          'xpack.createClassicStreamFlyout.nameAndConfirmStep.componentTemplatesLabel',
          { defaultMessage: 'Component templates' }
        ),
        description: (
          <>
            {componentTemplates.map((ct, idx) => (
              <div key={idx}>{ct}</div>
            ))}
          </>
        ),
      });
    }

    return items;
  }, [template, ilmPolicyName, ilmPhases, isLoadingIlmPolicy]);

  const panelStyles = css`
    padding: ${euiTheme.size.l};
    border-top: ${euiTheme.border.thin};
  `;

  return (
    <EuiPanel hasBorder={false} hasShadow={false} paddingSize="none" css={panelStyles}>
      <EuiTitle size="xxs">
        <h4>
          <FormattedMessage
            id="xpack.createClassicStreamFlyout.nameAndConfirmStep.confirmTitle"
            defaultMessage="Confirm index template details"
          />
        </h4>
      </EuiTitle>
      <EuiSpacer size="m" />

      <EuiDescriptionList
        listItems={
          templateDetails as Array<{
            title: NonNullable<React.ReactNode>;
            description: NonNullable<React.ReactNode>;
          }>
        }
        type="column"
        columnWidths={[1, 3]}
        compressed
        data-test-subj="templateDetails"
        css={css`
          row-gap: 16px;
          column-gap: 16px;

          .euiDescriptionList__title {
            white-space: nowrap;
            ${euiFontSize(euiThemeContext, 'xs')}
          }

          .euiDescriptionList__description {
            ${euiFontSize(euiThemeContext, 'xs')}
          }
        `}
      />
    </EuiPanel>
  );
};
