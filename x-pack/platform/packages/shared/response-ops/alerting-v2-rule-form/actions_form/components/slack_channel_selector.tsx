/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { parse, stringify } from 'yaml';
import React, { useState } from 'react';
import { useFetchSlackChannels } from '../hooks/use_fetch_slack_channels';
import type { InlineWorkflowActionDraft } from '../types';

interface SlackChannelSelectorProps {
  connectorId: string | null;
  params: string;
  onParamsChange: (params: string) => void;
}

export const SlackChannelSelector = ({
  connectorId,
  params,
  onParamsChange,
}: SlackChannelSelectorProps) => {
  const [hasOpened, setHasOpened] = useState(false);
  const { data: channels = [], isFetching } = useFetchSlackChannels({
    connectorId,
    enabled: hasOpened,
  });

  const options: Array<EuiComboBoxOptionOption<string>> = channels.map((channel) => ({
    label: `#${channel.name}`,
    value: channel.name,
  }));

  const handleChange = (selected: Array<EuiComboBoxOptionOption<string>>) => {
    const channelName = selected[0]?.value ?? '';

    let parsed: Record<string, unknown> = {};
    try {
      const result = parse(params);
      if (result !== null && typeof result === 'object' && !Array.isArray(result)) {
        parsed = result as Record<string, unknown>;
      }
    } catch {
      // leave parsed as empty — the YAML is malformed, we still write the channel
    }

    onParamsChange(stringify({ ...parsed, channel: channelName }));
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
    >
      <EuiComboBox
        fullWidth
        compressed
        singleSelection={{ asPlainText: true }}
        data-test-subj="slackChannelSelector"
        isLoading={isFetching}
        isDisabled={connectorId === null}
        placeholder={i18n.translate(
          'xpack.responseOps.alertingV2RuleForm.actionForm.slackChannelSelector.placeholder',
          { defaultMessage: 'Select a channel' }
        )}
        options={options}
        selectedOptions={selectedOptions}
        onChange={handleChange}
        onFocus={() => setHasOpened(true)}
      />
    </EuiFormRow>
  );
};

export const SlackChannelSelectorWrapper = ({
  value,
  onChange,
}: {
  value: InlineWorkflowActionDraft;
  onChange: (value: InlineWorkflowActionDraft) => void;
}) => (
  <SlackChannelSelector
    connectorId={value.connectorId}
    params={value.params}
    onParamsChange={(params) => onChange({ ...value, params })}
  />
);
