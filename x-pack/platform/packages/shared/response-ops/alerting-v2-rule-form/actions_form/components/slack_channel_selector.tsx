/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { updateYamlField } from '@kbn/workflows-yaml';
import { parse } from 'yaml';
import React, { useState } from 'react';
import { useFetchSlackChannels } from '../hooks/use_fetch_slack_channels';
import type { InlineActionParamError, InlineWorkflowActionDraft } from '../types';

interface SlackChannelSelectorProps {
  connectorId: string | null;
  params: string;
  onParamsChange: (params: string) => void;
  isInvalid?: boolean;
}

export const SlackChannelSelector = ({
  connectorId,
  params,
  onParamsChange,
  isInvalid = false,
}: SlackChannelSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { data: channels = [], isFetching } = useFetchSlackChannels({
    connectorId,
    enabled: isOpen,
  });

  const options: Array<EuiComboBoxOptionOption<string>> = channels.map((channel) => ({
    label: `#${channel.name}`,
    value: channel.name,
  }));

  // Patches only the `channel` value, keeping the rest of the params (comments,
  // quoting, even malformed YAML) as the user wrote them.
  const handleChange = (selected: Array<EuiComboBoxOptionOption<string>>) => {
    onParamsChange(updateYamlField(params, 'channel', selected[0]?.value ?? ''));
  };

  const selectedOptions = (() => {
    try {
      const channel = parse(params)?.channel;
      return channel ? [{ label: `#${channel}`, value: channel }] : [];
    } catch {
      return [];
    }
  })();

  return (
    <EuiFormRow
      label={i18n.translate(
        'xpack.responseOps.alertingV2RuleForm.actionForm.slackChannelSelector.label',
        { defaultMessage: 'Channel' }
      )}
      fullWidth
      isInvalid={isInvalid}
    >
      <EuiComboBox
        fullWidth
        compressed
        singleSelection={{ asPlainText: true }}
        data-test-subj="slackChannelSelector"
        isLoading={isFetching}
        isInvalid={isInvalid}
        isDisabled={connectorId === null}
        placeholder={i18n.translate(
          'xpack.responseOps.alertingV2RuleForm.actionForm.slackChannelSelector.placeholder',
          { defaultMessage: 'Select a channel' }
        )}
        options={options}
        selectedOptions={selectedOptions}
        onChange={handleChange}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
      />
    </EuiFormRow>
  );
};

export const SlackChannelSelectorWrapper = ({
  value,
  onChange,
  paramErrors,
}: {
  value: InlineWorkflowActionDraft;
  onChange: (value: InlineWorkflowActionDraft) => void;
  paramErrors: readonly InlineActionParamError[];
}) => (
  <SlackChannelSelector
    connectorId={value.connectorId}
    params={value.params}
    onParamsChange={(params) => onChange({ ...value, params })}
    isInvalid={paramErrors.some(({ key }) => key === 'channel')}
  />
);
