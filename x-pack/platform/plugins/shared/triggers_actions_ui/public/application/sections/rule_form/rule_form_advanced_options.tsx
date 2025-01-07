/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
  EuiPanel,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { RuleSpecificFlappingProperties } from '@kbn/alerting-types/rule_settings';
import { RuleSettingsFlappingForm } from '@kbn/alerts-ui-shared/src/rule_settings/rule_settings_flapping_form';
import { RuleSettingsFlappingTitleTooltip } from '@kbn/alerts-ui-shared/src/rule_settings/rule_settings_flapping_title_tooltip';
import { useFetchFlappingSettings } from '@kbn/alerts-ui-shared/src/common/hooks/use_fetch_flapping_settings';
import { useKibana } from '../../../common/lib/kibana';

const alertDelayFormRowLabel = i18n.translate(
  'xpack.triggersActionsUI.sections.ruleForm.alertDelayLabel',
  {
    defaultMessage: 'Alert delay',
  }
);

const alertDelayIconTipDescription = i18n.translate(
  'xpack.triggersActionsUI.sections.ruleForm.alertDelayFieldHelp',
  {
    defaultMessage:
      'An alert occurs only when the specified number of consecutive runs meet the rule conditions.',
  }
);

const alertDelayPrependLabel = i18n.translate(
  'xpack.triggersActionsUI.sections.ruleForm.alertDelayFieldLabel',
  {
    defaultMessage: 'Alert after',
  }
);

const alertDelayAppendLabel = i18n.translate(
  'xpack.triggersActionsUI.sections.ruleForm.alertDelayFieldAppendLabel',
  {
    defaultMessage: 'consecutive matches',
  }
);

const flappingFormRowLabel = i18n.translate(
  'xpack.triggersActionsUI.sections.ruleForm.flappingLabel',
  {
    defaultMessage: 'Alert flapping detection',
  }
);

const INTEGER_REGEX = /^[1-9][0-9]*$/;

export interface RuleFormAdvancedOptionsProps {
  alertDelay?: number;
  flappingSettings?: RuleSpecificFlappingProperties | null;
  onAlertDelayChange: (value: string) => void;
  onFlappingChange: (value: RuleSpecificFlappingProperties | null) => void;
  enabledFlapping?: boolean;
}

export const RuleFormAdvancedOptions = (props: RuleFormAdvancedOptionsProps) => {
  const {
    alertDelay,
    flappingSettings,
    enabledFlapping = true,
    onAlertDelayChange,
    onFlappingChange,
  } = props;

  const {
    application: {
      capabilities: { rulesSettings },
    },
    http,
  } = useKibana().services;

  const { writeFlappingSettingsUI } = rulesSettings || {};

  const [isFlappingTitlePopoverOpen, setIsFlappingTitlePopoverOpen] = useState<boolean>(false);

  const { data: spaceFlappingSettings, isInitialLoading } = useFetchFlappingSettings({
    http,
    enabled: enabledFlapping,
  });

  const internalOnAlertDelayChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (value === '' || INTEGER_REGEX.test(value)) {
        onAlertDelayChange(value);
      }
    },
    [onAlertDelayChange]
  );

  return (
    <EuiPanel color="subdued" hasShadow={false} data-test-subj="ruleFormAdvancedOptions">
      <EuiFlexGroup direction="column">
        <EuiFlexItem grow={false}>
          <EuiFormRow
            fullWidth
            label={
              <EuiFlexGroup gutterSize="xs">
                <EuiFlexItem>{alertDelayFormRowLabel}</EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiIconTip content={alertDelayIconTipDescription} position="top" />
                </EuiFlexItem>
              </EuiFlexGroup>
            }
            data-test-subj="alertDelayFormRow"
            display="rowCompressed"
          >
            <EuiFieldNumber
              fullWidth
              min={1}
              value={alertDelay || ''}
              name="alertDelay"
              data-test-subj="alertDelayInput"
              prepend={alertDelayPrependLabel}
              append={alertDelayAppendLabel}
              onChange={internalOnAlertDelayChange}
            />
          </EuiFormRow>
        </EuiFlexItem>
        {isInitialLoading && <EuiLoadingSpinner />}
        {spaceFlappingSettings && enabledFlapping && (
          <EuiFlexItem grow={false}>
            <EuiFormRow
              fullWidth
              label={
                <EuiFlexGroup gutterSize="none" alignItems="center">
                  <EuiFlexItem grow={false}>{flappingFormRowLabel}</EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <RuleSettingsFlappingTitleTooltip
                      isOpen={isFlappingTitlePopoverOpen}
                      setIsPopoverOpen={setIsFlappingTitlePopoverOpen}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              }
              data-test-subj="alertFlappingFormRow"
              display="rowCompressed"
            >
              <RuleSettingsFlappingForm
                flappingSettings={flappingSettings}
                spaceFlappingSettings={spaceFlappingSettings}
                canWriteFlappingSettingsUI={!!writeFlappingSettingsUI}
                onFlappingChange={onFlappingChange}
              />
            </EuiFormRow>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
};
