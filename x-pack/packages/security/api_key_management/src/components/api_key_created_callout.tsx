/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { FunctionComponent } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { CreateAPIKeyResult } from './api_keys_api_client';
import { SelectableTokenField } from './token_field';

export interface ApiKeyCreatedCalloutProps {
  createdApiKey: CreateAPIKeyResult;
}

export const ApiKeyCreatedCallout: FunctionComponent<ApiKeyCreatedCalloutProps> = ({
  createdApiKey,
}) => {
  return (
    <EuiCallOut
      color="success"
      iconType="check"
      title={i18n.translate('xpack.security.management.apiKeys.createSuccessMessage', {
        defaultMessage: "Created API key ''{name}''",
        values: { name: createdApiKey.name },
      })}
    >
      <p>
        <FormattedMessage
          id="xpack.security.management.apiKeys.successDescription"
          defaultMessage="Copy this key now. You will not be able to view it again."
        />
      </p>
      <ApiKeySelectableTokenField createdApiKey={createdApiKey} />
    </EuiCallOut>
  );
};

export const ApiKeySelectableTokenField: FunctionComponent<ApiKeyCreatedCalloutProps> = ({
  createdApiKey,
}) => {
  const concatenated = `${createdApiKey.id}:${createdApiKey.api_key}`;
  return (
    <SelectableTokenField
      options={[
        {
          key: 'encoded',
          value: createdApiKey.encoded,
          icon: 'empty',
          label: i18n.translate('xpack.security.management.apiKeys.encodedLabel', {
            defaultMessage: 'Encoded',
          }),
          description: i18n.translate('xpack.security.management.apiKeys.encodedDescription', {
            defaultMessage: 'Format used to make requests to Elasticsearch REST API.',
          }),
        },
        {
          key: 'beats',
          value: concatenated,
          icon: 'logoBeats',
          label: i18n.translate('xpack.security.management.apiKeys.beatsLabel', {
            defaultMessage: 'Beats',
          }),
          description: i18n.translate('xpack.security.management.apiKeys.beatsDescription', {
            defaultMessage: 'Format used to configure Beats.',
          }),
        },
        {
          key: 'logstash',
          value: concatenated,
          icon: 'logoLogstash',
          label: i18n.translate('xpack.security.management.apiKeys.logstashLabel', {
            defaultMessage: 'Logstash',
          }),
          description: i18n.translate('xpack.security.management.apiKeys.logstashDescription', {
            defaultMessage: 'Format used to configure Logstash.',
          }),
        },
      ]}
    />
  );
};
