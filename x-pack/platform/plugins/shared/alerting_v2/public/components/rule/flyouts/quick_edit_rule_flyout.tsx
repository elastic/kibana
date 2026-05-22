/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiHorizontalRule,
  EuiIconTip,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { useService, CoreStart } from '@kbn/core-di-browser';
import { PluginStart } from '@kbn/core-di';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import { FormProvider, useForm } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  RuleFormProvider,
  RuleDetailsFieldGroup,
  ConditionFieldGroup,
  RuleExecutionFieldGroup,
  AlertConditionsFieldGroup,
  KindField,
  mapRuleResponseToFormValues,
  mapFormValuesToUpdateRequest,
} from '@kbn/alerting-v2-rule-form';
import type { FormValues } from '@kbn/alerting-v2-rule-form';
import type { RuleApiResponse } from '../../../services/rules_api';
import { useUpdateRule } from '../../../hooks/use_update_rule';

const FLYOUT_TITLE_ID = 'quickEditRuleFlyoutTitle';

export interface QuickEditRuleFlyoutProps {
  rule: RuleApiResponse;
  onClose: () => void;
}

export const QuickEditRuleFlyout = ({ rule, onClose }: QuickEditRuleFlyoutProps) => {
  const http = useService(CoreStart('http'));
  const notifications = useService(CoreStart('notifications'));
  const application = useService(CoreStart('application'));
  const data = useService(PluginStart('data')) as DataPublicPluginStart;
  const dataViews = useService(PluginStart('dataViews')) as DataViewsPublicPluginStart;
  const lens = useService(PluginStart('lens')) as LensPublicStart;

  const ruleFormServices = useMemo(
    () => ({ http, data, dataViews, notifications, application, lens }),
    [http, data, dataViews, notifications, application, lens]
  );

  const defaultValues = useMemo<FormValues>(() => {
    const mapped = mapRuleResponseToFormValues(rule);
    return {
      kind: mapped.kind ?? 'alert',
      metadata: {
        name: mapped.metadata?.name ?? '',
        enabled: mapped.metadata?.enabled ?? true,
        description: mapped.metadata?.description ?? '',
        owner: mapped.metadata?.owner,
        tags: mapped.metadata?.tags,
      },
      timeField: mapped.timeField ?? '@timestamp',
      schedule: {
        every: mapped.schedule?.every ?? '1m',
        lookback: mapped.schedule?.lookback ?? '5m',
      },
      evaluation: {
        query: {
          base: mapped.evaluation?.query?.base ?? '',
        },
      },
      grouping: mapped.grouping,
      recoveryPolicy: mapped.recoveryPolicy ?? { type: 'no_breach' },
      stateTransition: mapped.stateTransition,
      stateTransitionAlertDelayMode: mapped.stateTransitionAlertDelayMode ?? 'immediate',
      stateTransitionRecoveryDelayMode: mapped.stateTransitionRecoveryDelayMode ?? 'immediate',
      artifacts: mapped.artifacts,
    };
  }, [rule]);

  const methods = useForm<FormValues>({
    mode: 'onBlur',
    defaultValues,
  });

  const updateRuleMutation = useUpdateRule();

  const handleSubmit = (values: FormValues) => {
    const payload = mapFormValuesToUpdateRequest(values);
    updateRuleMutation.mutate({ id: rule.id, payload }, { onSuccess: () => onClose() });
  };

  return (
    <RuleFormProvider services={ruleFormServices} meta={{ layout: 'flyout' }}>
      <FormProvider {...methods}>
        <EuiFlyout
          type="push"
          hasAnimation
          size="s"
          ownFocus
          hideCloseButton
          paddingSize="none"
          onClose={onClose}
          aria-labelledby={FLYOUT_TITLE_ID}
          data-test-subj="quickEditRuleFlyout"
        >
          <EuiFlyoutHeader hasBorder>
            <EuiPanel
              paddingSize="m"
              hasShadow={false}
              hasBorder={false}
              borderRadius="none"
              color="transparent"
            >
              <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiTitle size="s" id={FLYOUT_TITLE_ID}>
                        <h2>
                          <FormattedMessage
                            id="xpack.alertingV2.quickEditRuleFlyout.title"
                            defaultMessage="Quick Edit Alert Rule"
                          />
                        </h2>
                      </EuiTitle>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiIconTip
                        content={i18n.translate(
                          'xpack.alertingV2.quickEditRuleFlyout.titleTooltip',
                          {
                            defaultMessage: 'Inline editing offers limited configuration options',
                          }
                        )}
                        position="bottom"
                        type="info"
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    iconType="cross"
                    color="text"
                    onClick={onClose}
                    aria-label={i18n.translate('xpack.alertingV2.quickEditRuleFlyout.close', {
                      defaultMessage: 'Close',
                    })}
                    data-test-subj="quickEditRuleFlyoutCloseButton"
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <EuiPanel
              paddingSize="m"
              hasShadow={false}
              hasBorder={false}
              borderRadius="none"
              color="transparent"
            >
              <EuiForm
                component="form"
                onSubmit={methods.handleSubmit(handleSubmit)}
                id="quickEditRuleForm"
              >
                <RuleDetailsFieldGroup />
                <EuiSpacer size="m" />
                <ConditionFieldGroup includeBase={false} />
                <EuiSpacer size="m" />
                <RuleExecutionFieldGroup />
                <EuiSpacer size="m" />
                <KindField disabled compact />
                <EuiSpacer size="m" />
                <AlertConditionsFieldGroup />
              </EuiForm>
            </EuiPanel>
          </EuiFlyoutBody>
          <EuiHorizontalRule margin="none" />
          <EuiFlyoutFooter>
            <EuiPanel
              paddingSize="m"
              hasShadow={false}
              hasBorder={false}
              borderRadius="none"
              color="transparent"
            >
              <EuiFlexGroup justifyContent="spaceBetween">
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    onClick={onClose}
                    data-test-subj="quickEditRuleFlyoutCancelButton"
                  >
                    <FormattedMessage
                      id="xpack.alertingV2.quickEditRuleFlyout.cancel"
                      defaultMessage="Cancel"
                    />
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    fill
                    type="submit"
                    form="quickEditRuleForm"
                    isLoading={updateRuleMutation.isLoading}
                    data-test-subj="quickEditRuleFlyoutSubmitButton"
                  >
                    <FormattedMessage
                      id="xpack.alertingV2.quickEditRuleFlyout.submit"
                      defaultMessage="Apply and close"
                    />
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlyoutFooter>
        </EuiFlyout>
      </FormProvider>
    </RuleFormProvider>
  );
};
