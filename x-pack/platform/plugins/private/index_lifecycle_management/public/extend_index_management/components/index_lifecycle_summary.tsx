/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import moment from 'moment-timezone';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import type { EuiBadgeProps } from '@elastic/eui';
import {
  EuiCodeBlock,
  EuiLink,
  EuiFlexItem,
  EuiFlexGroup,
  EuiPanel,
  EuiText,
  EuiSpacer,
  EuiDescriptionList,
  EuiBadge,
  EuiCode,
} from '@elastic/eui';

import type { ApplicationStart } from '@kbn/core/public';
import type { IndexDetailsTab } from '@kbn/index-management-shared-types';
import type {
  IlmExplainLifecycleLifecycleExplain,
  IlmExplainLifecycleLifecycleExplainManaged,
  IlmExplainLifecycleResponse,
} from '@elastic/elasticsearch/lib/api/types';
import { usePhaseColors } from '@kbn/data-lifecycle-phases';
import type { Index, Phase } from '../../../common/types';
import { getPolicyEditPath } from '../../application/services/navigation';
import { PHASE_NAMES } from '../../application/lib';
import { sendGet } from '../../application/services/http';
import { usePollingUntil } from '../../application/hooks/use_polling_until';

interface IndexLifecycleSummaryProps {
  index: Index;
  getUrlForApp: ApplicationStart['getUrlForApp'];
}

export const IndexLifecycleSummary = ({ index, getUrlForApp }: IndexLifecycleSummaryProps) => {
  const baseIlm = index.ilm as IlmExplainLifecycleLifecycleExplain | undefined;
  const [ilm, setIlm] = useState<IlmExplainLifecycleLifecycleExplain | undefined>(baseIlm);

  const lastIndexNameRef = useRef<string>(index.name);

  const getIlmCompletenessScore = useCallback(
    (value: IlmExplainLifecycleLifecycleExplain | undefined) => {
      if (!value || !value.managed) return 0;
      const managed = value as IlmExplainLifecycleLifecycleExplainManaged;
      return (
        Number(Boolean(managed.policy)) +
        Number(Boolean(managed.phase)) +
        Number(Boolean(managed.action)) +
        Number(Boolean(managed.step))
      );
    },
    []
  );

  const getIlmFreshnessScore = useCallback(
    (value: IlmExplainLifecycleLifecycleExplain | undefined) => {
      if (!value || !value.managed) return 0;
      const managed = value as IlmExplainLifecycleLifecycleExplainManaged;

      return Math.max(
        managed.lifecycle_date_millis ?? 0,
        managed.phase_time_millis ?? 0,
        managed.action_time_millis ?? 0,
        managed.step_time_millis ?? 0
      );
    },
    []
  );

  useEffect(() => {
    if (lastIndexNameRef.current !== index.name) {
      lastIndexNameRef.current = index.name;
      setIlm(baseIlm);
      return;
    }

    setIlm((current) => {
      if (!current) return baseIlm;
      if (!baseIlm) return current;

      const currentScore = getIlmCompletenessScore(current);
      const nextScore = getIlmCompletenessScore(baseIlm);

      const currentFreshness = getIlmFreshnessScore(current);
      const nextFreshness = getIlmFreshnessScore(baseIlm);

      if (
        nextScore > currentScore ||
        (nextScore === currentScore && nextFreshness > currentFreshness)
      ) {
        return baseIlm;
      }

      return current;
    });
  }, [baseIlm, getIlmCompletenessScore, getIlmFreshnessScore, index.name]);

  const effectiveIlm = ilm?.index === index.name ? ilm : baseIlm;

  const managedIlm =
    effectiveIlm && effectiveIlm.managed
      ? (effectiveIlm as IlmExplainLifecycleLifecycleExplainManaged)
      : undefined;

  const shouldFetchExplain = Boolean(
    managedIlm &&
      (!managedIlm.policy || !managedIlm.phase || !managedIlm.action || !managedIlm.step)
  );

  const pollExplain = useCallback(async () => {
    const response = await sendGet('explain', { index: index.name });
    const body = response as Partial<IlmExplainLifecycleResponse> | undefined;
    const explain = body?.indices?.[index.name];
    if (!explain) {
      throw new Error(`Missing explain payload for index ${index.name}`);
    }
    return explain;
  }, [index.name]);

  const shouldStopPolling = useCallback((value: IlmExplainLifecycleLifecycleExplain) => {
    const nextManaged = value.managed
      ? (value as IlmExplainLifecycleLifecycleExplainManaged)
      : undefined;
    return Boolean(
      nextManaged?.policy && nextManaged?.phase && nextManaged?.action && nextManaged?.step
    );
  }, []);

  const explainPollingStatus = usePollingUntil<IlmExplainLifecycleLifecycleExplain>({
    enabled: shouldFetchExplain,
    pollIntervalMs: 1000,
    maxAttempts: 6,
    onPoll: pollExplain,
    shouldStop: shouldStopPolling,
    onUpdate: setIlm,
  });

  const policyName = managedIlm?.policy;
  const phase = managedIlm?.phase;
  const ilmEditPolicyHref = policyName
    ? getUrlForApp('management', {
        path: `data/index_lifecycle_management/${getPolicyEditPath(policyName)}`,
      })
    : undefined;

  const phaseColors = usePhaseColors();
  const phaseToBadgeMapping: Record<Phase, { color: EuiBadgeProps['color']; label: string }> = {
    hot: {
      color: phaseColors.hot,
      label: PHASE_NAMES.hot,
    },
    warm: {
      color: phaseColors.warm,
      label: PHASE_NAMES.warm,
    },
    cold: {
      color: phaseColors.cold,
      label: PHASE_NAMES.cold,
    },
    frozen: {
      color: phaseColors.frozen,
      label: PHASE_NAMES.frozen,
    },
    delete: {
      color: 'default',
      label: PHASE_NAMES.delete,
    },
  };

  const phaseBadgeFromMapping = phase ? phaseToBadgeMapping[phase as Phase] : undefined;
  const phaseBadgeConfig = phaseBadgeFromMapping ?? {
    color: 'default',
    label:
      phase ??
      i18n.translate('xpack.indexLifecycleMgmt.indexLifecycleMgmtSummary.pendingPhaseLabel', {
        defaultMessage: 'Pending',
      }),
  };
  const lifecycleProperties = [
    {
      title: i18n.translate(
        'xpack.indexLifecycleMgmt.indexLifecycleMgmtSummary.headers.policyNameTitle',
        {
          defaultMessage: 'Policy name',
        }
      ),
      description:
        policyName ??
        i18n.translate('xpack.indexLifecycleMgmt.indexLifecycleMgmtSummary.unknownPolicyLabel', {
          defaultMessage: 'Unknown',
        }),
    },
    {
      title: i18n.translate(
        'xpack.indexLifecycleMgmt.indexLifecycleMgmtSummary.headers.currentPhaseTitle',
        {
          defaultMessage: 'Current phase',
        }
      ),
      description: <EuiBadge color={phaseBadgeConfig.color}>{phaseBadgeConfig.label}</EuiBadge>,
    },
  ];
  if (managedIlm?.action) {
    lifecycleProperties.push({
      title: i18n.translate(
        'xpack.indexLifecycleMgmt.indexLifecycleMgmtSummary.headers.currentActionTitle',
        {
          defaultMessage: 'Current action',
        }
      ),
      description: <EuiCode>{managedIlm.action}</EuiCode>,
    });
  }
  if (managedIlm?.action_time_millis) {
    lifecycleProperties.push({
      title: i18n.translate(
        'xpack.indexLifecycleMgmt.indexLifecycleMgmtSummary.headers.currentActionTimeTitle',
        {
          defaultMessage: 'Current action time',
        }
      ),
      description: moment(managedIlm.action_time_millis).format('YYYY-MM-DD HH:mm:ss'),
    });
  }
  if (managedIlm?.step) {
    lifecycleProperties.push({
      title: i18n.translate(
        'xpack.indexLifecycleMgmt.indexLifecycleMgmtSummary.headers.currentStepTitle',
        {
          defaultMessage: 'Current step',
        }
      ),
      description: <EuiCode>{managedIlm.step}</EuiCode>,
    });
  }
  return (
    <>
      <EuiFlexGroup wrap>
        <EuiFlexItem
          grow={1}
          css={css`
            min-width: 400px;
          `}
        >
          <EuiPanel hasBorder={true} grow={false} data-test-subj="policyPropertiesPanel">
            <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiText size="xs">
                  <h3>
                    <FormattedMessage
                      defaultMessage="Lifecycle policy"
                      id="xpack.indexLifecycleMgmt.indexLifecycleMgmtSummary.policyCardTitle"
                    />
                  </h3>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                {ilmEditPolicyHref ? (
                  <EuiLink color="primary" href={ilmEditPolicyHref} target="_blank">
                    <FormattedMessage
                      defaultMessage="Edit policy in ILM"
                      id="xpack.indexLifecycleMgmt.indexLifecycleMgmtSummary.ilmLinkLabel"
                    />
                  </EuiLink>
                ) : null}
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiSpacer />
            <EuiDescriptionList
              rowGutterSize="m"
              type="responsiveColumn"
              columnWidths={[1, 1]}
              listItems={lifecycleProperties}
            />
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem
          grow={3}
          css={css`
            min-width: 600px;
          `}
        >
          {shouldFetchExplain && explainPollingStatus === 'polling' && (
            <>
              <EuiPanel hasBorder={true} grow={false} data-test-subj="ilmExplainPendingPanel">
                <EuiText size="s" color="subdued">
                  <FormattedMessage
                    id="xpack.indexLifecycleMgmt.indexLifecycleMgmtSummary.refreshingExplainMessage"
                    defaultMessage="Refreshing lifecycle details…"
                  />
                </EuiText>
              </EuiPanel>
              <EuiSpacer />
            </>
          )}
          {shouldFetchExplain && explainPollingStatus === 'exhausted' && (
            <>
              <EuiPanel hasBorder={true} grow={false} data-test-subj="ilmExplainFailedPanel">
                <EuiText size="s" color="subdued">
                  <FormattedMessage
                    id="xpack.indexLifecycleMgmt.indexLifecycleMgmtSummary.refreshingExplainFailedMessage"
                    defaultMessage="Unable to refresh lifecycle details."
                  />
                </EuiText>
              </EuiPanel>
              <EuiSpacer />
            </>
          )}
          {managedIlm?.step_info && managedIlm.step === 'ERROR' && (
            // there is an error
            <>
              <EuiPanel
                color="danger"
                hasBorder={true}
                grow={false}
                data-test-subj="policyErrorPanel"
              >
                <EuiText size="xs">
                  <h3>
                    <FormattedMessage
                      defaultMessage="Lifecycle error"
                      id="xpack.indexLifecycleMgmt.indexLifecycleMgmtSummary.lifecycleErrorTitle"
                    />
                  </h3>
                  <EuiSpacer />
                  <EuiCodeBlock language="json" isCopyable>
                    {JSON.stringify(
                      { failed_step: managedIlm.failed_step, step_info: managedIlm.step_info },
                      null,
                      2
                    )}
                  </EuiCodeBlock>
                </EuiText>
              </EuiPanel>
              <EuiSpacer />
            </>
          )}
          {managedIlm?.step_info && managedIlm.step !== 'ERROR' && (
            // ILM is waiting for the step to complete
            <>
              <EuiPanel hasBorder={true} grow={false} data-test-subj="policyStepPanel">
                <EuiText size="xs">
                  <h3>
                    <FormattedMessage
                      defaultMessage="Current step info"
                      id="xpack.indexLifecycleMgmt.indexLifecycleMgmtSummary.stepInfoTitle"
                    />
                  </h3>
                  <EuiSpacer />
                  <EuiCodeBlock language="json" isCopyable>
                    {JSON.stringify(managedIlm.step_info, null, 2)}
                  </EuiCodeBlock>
                </EuiText>
              </EuiPanel>
              <EuiSpacer />
            </>
          )}
          {managedIlm?.phase_execution && (
            <EuiPanel hasBorder={true} grow={false} data-test-subj="phaseDefinitionPanel">
              <EuiText size="xs">
                <h3>
                  <FormattedMessage
                    defaultMessage="Current phase definition"
                    id="xpack.indexLifecycleMgmt.indexLifecycleMgmtSummary.phaseDefinitionTitle"
                  />
                </h3>
              </EuiText>
              <EuiSpacer />
              <EuiCodeBlock language="json" isCopyable>
                {JSON.stringify(managedIlm.phase_execution, null, 2)}
              </EuiCodeBlock>
            </EuiPanel>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

export const indexLifecycleTab: IndexDetailsTab = {
  id: 'ilm',
  name: (
    <FormattedMessage
      defaultMessage="Index lifecycle"
      id="xpack.indexLifecycleMgmt.indexLifecycleMgmtSummary.tabHeaderLabel"
    />
  ),
  order: 50,
  renderTabContent: ({ index, getUrlForApp }) => (
    <IndexLifecycleSummary index={index} getUrlForApp={getUrlForApp} />
  ),
  shouldRenderTab: ({ index }) => {
    return Boolean(index.ilm && index.ilm.managed);
  },
};
