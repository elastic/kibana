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
  /** Sub-action returning the connector's channels. */
  subAction?: string;
  /**
   * Which channel field to write into the step params. Slack (v2) resolves channels by name,
   * while the Elastic Slack app resolves the deployment's binding by channel id.
   */
  channelValueField?: 'id' | 'name';
  dataTestSubj?: string;
}

export const SlackChannelSelector = ({
  connectorId,
  params,
  onParamsChange,
  subAction,
  channelValueField = 'name',
  dataTestSubj = 'slackChannelSelector',
}: SlackChannelSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { data: channels = [], isFetching } = useFetchSlackChannels({
    connectorId,
    subAction,
    enabled: isOpen,
  });

  const options: Array<EuiComboBoxOptionOption<string>> = channels.map((channel) => ({
    label: `#${channel.name}`,
    value: channel[channelValueField],
  }));

  const handleChange = (selected: Array<EuiComboBoxOptionOption<string>>) => {
    const channel = selected[0]?.value ?? '';

    let parsed: Record<string, unknown> = {};
    try {
      const result = parse(params);
      if (result !== null && typeof result === 'object' && !Array.isArray(result)) {
        parsed = result as Record<string, unknown>;
      }
    } catch {
      // leave parsed as empty — the YAML is malformed, we still write the channel
    }

    onParamsChange(stringify({ ...parsed, channel }));
  };

  const selectedOptions = (() => {
    let channel: unknown;
    try {
      channel = parse(params)?.channel;
    } catch {
      return [];
    }

    if (!channel || typeof channel !== 'string') {
      return [];
    }

    // Channels are only fetched once the combo box is opened, so an id-valued selection shows
    // its raw id until the list arrives and can resolve the display name.
    const match = channels.find(({ [channelValueField]: value }) => value === channel);
    return [{ label: `#${match?.name ?? channel}`, value: channel }];
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
        data-test-subj={dataTestSubj}
        isLoading={isFetching}
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

/**
 * The Elastic Slack app posts through the Relay, which resolves the deployment's binding by
 * channel id — a channel name would be rejected as unbound.
 */
export const ElasticSlackChannelSelectorWrapper = ({
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
    channelValueField="id"
    dataTestSubj="elasticSlackChannelSelector"
  />
);
