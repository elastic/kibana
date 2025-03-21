/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCode, EuiLink } from '@elastic/eui';
import { UserAgentProcessorConfig, UserAgentProcessorDefinition } from '@kbn/streams-schema';
import { isEmpty } from 'lodash';
import { ConfigDrivenProcessorConfiguration } from '../types';

export type UserAgentProcessorFormState = UserAgentProcessorConfig & { type: 'user_agent' };

export const userAgentProcessorConfig: ConfigDrivenProcessorConfiguration<
  UserAgentProcessorFormState,
  UserAgentProcessorDefinition
> = {
  value: 'user_agent' as const,
  inputDisplay: i18n.translate(
    'xpack.streams.streamDetailView.managementTab.enrichment.processor.UserAgentInputDisplay',
    {
      defaultMessage: 'User agent',
    }
  ),
  getDocUrl: (esDocUrl: string) => {
    return (
      <FormattedMessage
        id="xpack.streams.streamDetailView.managementTab.enrichment.processor.userAgentHelpText"
        defaultMessage="{userAgentLink} extracts details from the user agent string a browser sends with its web requests. This processor adds this information by default under the {userAgentField} field."
        values={{
          userAgentLink: (
            <EuiLink
              data-test-subj="streamsAppAvailableProcessorsUserAgentLink"
              external
              target="_blank"
              href={esDocUrl + 'user-agent-processor.html'}
            >
              {i18n.translate('xpack.streams.availableProcessors.userAgentLinkLabel', {
                defaultMessage: 'The user_agent processor',
              })}
            </EuiLink>
          ),
          userAgentField: <EuiCode>user_agent</EuiCode>,
        }}
      />
    );
  },
  defaultFormState: {
    type: 'user_agent' as const,
    field: '',
    target_field: '',
    regex_file: '',
    properties: [],
    ignore_missing: false,
  },
  convertFormStateToConfig: (formState) => {
    return {
      user_agent: {
        field: formState.field,
        target_field: isEmpty(formState.target_field) ? undefined : formState.target_field,
        regex_file: isEmpty(formState.regex_file) ? undefined : formState.regex_file,
        properties: isEmpty(formState.properties) ? undefined : formState.properties,
        ignore_missing: formState.ignore_missing,
      },
    };
  },
  convertProcessorToFormState: (processor) => {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { user_agent } = processor;

    return structuredClone({
      ...user_agent,
      type: 'user_agent',
      properties: user_agent.properties ?? [],
    });
  },
  fieldConfigurations: [
    {
      field: 'target_field',
      type: 'string',
      required: false,
      label: i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.userAgentTargetFieldLabel',
        { defaultMessage: 'Target field' }
      ),
      helpText: (
        <FormattedMessage
          id="xpack.streams.streamDetailView.managementTab.enrichment.processor.userAgentTargetFieldHelpText"
          defaultMessage="The field that will be filled with the user agent details. Default is {userAgentField}."
          values={{
            userAgentField: <EuiCode>user_agent</EuiCode>,
          }}
        />
      ),
    },
    {
      field: 'regex_file',
      type: 'string',
      required: false,
      label: i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.userAgentRegexFileLabel',
        { defaultMessage: 'Regex file' }
      ),
      helpText: (
        <FormattedMessage
          id="xpack.streams.streamDetailView.managementTab.enrichment.processor.userAgentRegexFileHelpText"
          defaultMessage="The name of the file in the config/ingest-user-agent directory containing the regular expressions for parsing the user agent string. Both the directory and the file have to be created before starting Elasticsearch. If not specified, ingest-user-agent will use the regexes.yaml from uap-core it ships with."
        />
      ),
    },
    {
      field: 'properties',
      type: 'array',
      required: false,
      label: i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.userAgentPropertiesLabel',
        { defaultMessage: 'Properties' }
      ),
      helpText: (
        <FormattedMessage
          id="xpack.streams.streamDetailView.managementTab.enrichment.processor.userAgentPropertiesHelpText"
          defaultMessage="Controls what properties are added to {targetField}."
          values={{
            targetField: <EuiCode>target_field</EuiCode>,
          }}
        />
      ),
    },
  ],
  fieldOptions: {
    fieldHelpText: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processor.userAgentFieldHelpText',
      { defaultMessage: 'The field containing the user agent string.' }
    ),
    includeCondition: false,
    includeIgnoreFailures: false,
    includeIgnoreMissing: true,
  },
};
