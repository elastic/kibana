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
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { CreateRuleData } from '@kbn/alerting-v2-schemas';
import type { RuleApiResponse } from '../../services/rules_api';
import { buildFlowRuleData } from '../../queries/build_flow/build_flow_rule';

const LOOKBACK_OPTIONS = [
  { value: '5m', text: '5 minutes' },
  { value: '15m', text: '15 minutes' },
  { value: '1h', text: '1 hour' },
  { value: '6h', text: '6 hours' },
  { value: '24h', text: '24 hours' },
];

export interface BuildFlowFlyoutProps {
  rules: [RuleApiResponse, RuleApiResponse];
  isSaving: boolean;
  onClose: () => void;
  onCreate: (payload: CreateRuleData) => void;
}

const ruleLabel = (rule: RuleApiResponse) => rule.metadata?.name ?? rule.id;

export const BuildFlowFlyout: React.FC<BuildFlowFlyoutProps> = ({
  rules,
  isSaving,
  onClose,
  onCreate,
}) => {
  const titleId = useGeneratedHtmlId({ prefix: 'buildFlowFlyoutTitle' });
  const [order, setOrder] = useState<[RuleApiResponse, RuleApiResponse]>(rules);
  const [lookback, setLookback] = useState('24h');
  const [name, setName] = useState(
    () => `${ruleLabel(rules[0])} → ${ruleLabel(rules[1])}`
  );
  const [nameEdited, setNameEdited] = useState(false);

  const [firstRule, thenRule] = order;

  const swapOrder = () => {
    setOrder(([a, b]) => [b, a]);
    if (!nameEdited) {
      setName(`${ruleLabel(order[1])} → ${ruleLabel(order[0])}`);
    }
  };

  const preview = useMemo(
    () =>
      buildFlowRuleData({
        name,
        ruleIds: [firstRule.id, thenRule.id],
        lookback,
      }),
    [name, firstRule.id, thenRule.id, lookback]
  );

  return (
    <EuiFlyout onClose={onClose} aria-labelledby={titleId} size="m" data-test-subj="buildFlowFlyout">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={titleId}>
            <FormattedMessage
              id="xpack.alertingV2.buildFlow.title"
              defaultMessage="Build a Flow"
            />
          </h2>
        </EuiTitle>
        <EuiText size="s" color="subdued">
          <FormattedMessage
            id="xpack.alertingV2.buildFlow.subtitle"
            defaultMessage="Create a new rule that fires when these two rules occur in sequence, within a time window. Neither source rule is modified."
          />
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem>
            <EuiPanel hasBorder paddingSize="m" data-test-subj="buildFlowFirstRule">
              <EuiText size="xs" color="subdued">
                <FormattedMessage id="xpack.alertingV2.buildFlow.firstLabel" defaultMessage="First" />
              </EuiText>
              <EuiText size="s">
                <strong>{ruleLabel(firstRule)}</strong>
              </EuiText>
            </EuiPanel>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="sortRight"
              display="base"
              size="m"
              onClick={swapOrder}
              aria-label={i18n.translate('xpack.alertingV2.buildFlow.swapOrder', {
                defaultMessage: 'Swap order',
              })}
              data-test-subj="buildFlowSwapOrder"
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiPanel hasBorder paddingSize="m" data-test-subj="buildFlowThenRule">
              <EuiText size="xs" color="subdued">
                <FormattedMessage id="xpack.alertingV2.buildFlow.thenLabel" defaultMessage="Then" />
              </EuiText>
              <EuiText size="s">
                <strong>{ruleLabel(thenRule)}</strong>
              </EuiText>
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="l" />

        <EuiFormRow
          label={i18n.translate('xpack.alertingV2.buildFlow.windowLabel', {
            defaultMessage: 'Within',
          })}
          helpText={i18n.translate('xpack.alertingV2.buildFlow.windowHelp', {
            defaultMessage: 'How long after "{first}" should "{then}" still count as related?',
            values: { first: ruleLabel(firstRule), then: ruleLabel(thenRule) },
          })}
        >
          <EuiSelect
            options={LOOKBACK_OPTIONS}
            value={lookback}
            onChange={(e) => setLookback(e.target.value)}
            data-test-subj="buildFlowWindowSelect"
          />
        </EuiFormRow>

        <EuiSpacer size="m" />

        <EuiFormRow
          label={i18n.translate('xpack.alertingV2.buildFlow.nameLabel', { defaultMessage: 'Flow name' })}
        >
          <EuiFieldText
            value={name}
            onChange={(e) => {
              setNameEdited(true);
              setName(e.target.value);
            }}
            data-test-subj="buildFlowNameInput"
          />
        </EuiFormRow>

        <EuiSpacer size="l" />

        <EuiText size="xs" color="subdued">
          <FormattedMessage
            id="xpack.alertingV2.buildFlow.previewLabel"
            defaultMessage="Generated ES|QL (editable after creation):"
          />
        </EuiText>
        <EuiSpacer size="xs" />
        <EuiPanel color="subdued" paddingSize="s" data-test-subj="buildFlowEsqlPreview">
          <EuiText size="xs">
            <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
              {preview.query.format === 'standalone' ? preview.query.breach.query : ''}
            </pre>
          </EuiText>
        </EuiPanel>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} data-test-subj="buildFlowCancel">
              <FormattedMessage id="xpack.alertingV2.buildFlow.cancel" defaultMessage="Cancel" />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              isLoading={isSaving}
              onClick={() => onCreate(preview)}
              data-test-subj="buildFlowSubmit"
            >
              <FormattedMessage id="xpack.alertingV2.buildFlow.submit" defaultMessage="Create flow rule" />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
