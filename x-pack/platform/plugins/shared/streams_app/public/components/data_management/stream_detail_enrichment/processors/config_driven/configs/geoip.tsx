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
import { GeoIpProcessorConfig, GeoIpProcessorDefinition } from '@kbn/streams-schema';
import { isEmpty } from 'lodash';
import { ConfigDrivenProcessorConfiguration } from '../types';

export type GeoIpProcessorFormState = GeoIpProcessorConfig & { type: 'geoip' };

export const geoIpProcessorConfig: ConfigDrivenProcessorConfiguration<
  GeoIpProcessorFormState,
  GeoIpProcessorDefinition
> = {
  type: 'geoip' as const,
  inputDisplay: i18n.translate(
    'xpack.streams.streamDetailView.managementTab.enrichment.processor.geoIpInputDisplay',
    {
      defaultMessage: 'GeoIP',
    }
  ),
  getDocUrl: (esDocUrl: string) => {
    return (
      <FormattedMessage
        id="xpack.streams.streamDetailView.managementTab.enrichment.processor.geoIpHelpText"
        defaultMessage="Adds information about the geographical location of an {geoIpLink}"
        values={{
          geoIpLink: (
            <EuiLink
              data-test-subj="streamsAppAvailableProcessorsGeoIpLink"
              external
              target="_blank"
              href={esDocUrl + 'geoip-processor.html'}
            >
              {i18n.translate('xpack.streams.availableProcessors.geoIpLinkLabel', {
                defaultMessage: 'IPv4 or IPv6 address.',
              })}
            </EuiLink>
          ),
        }}
      />
    );
  },
  defaultFormState: {
    type: 'geoip' as const,
    field: '',
    target_field: '',
    database_file: '',
    properties: [],
    ignore_missing: false,
    first_only: true,
  },
  convertFormStateToConfig: (formState) => {
    return {
      geoip: {
        field: formState.field,
        target_field: isEmpty(formState.target_field) ? undefined : formState.target_field,
        database_file: isEmpty(formState.database_file) ? undefined : formState.database_file,
        properties: isEmpty(formState.properties) ? undefined : formState.properties,
        ignore_missing: formState.ignore_missing,
        first_only: formState.first_only,
      },
    };
  },
  convertProcessorToFormState: (processor) => {
    const { geoip } = processor;

    return structuredClone({
      ...geoip,
      type: 'geoip',
      properties: geoip.properties ?? [],
    });
  },
  fieldConfigurations: [
    {
      field: 'target_field',
      type: 'string',
      required: false,
      label: i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.geoIpTargetFieldLabel',
        { defaultMessage: 'Target field' }
      ),
      helpText: (
        <FormattedMessage
          id="xpack.streams.streamDetailView.managementTab.enrichment.processor.geoIpTargetFieldHelpText"
          defaultMessage="The field that will hold the geographical information looked up from the database."
        />
      ),
    },
    {
      field: 'database_file',
      type: 'string',
      required: false,
      label: i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.geoIpDatabaseFileLabel',
        { defaultMessage: 'Database file' }
      ),
      helpText: (
        <FormattedMessage
          id="xpack.streams.streamDetailView.managementTab.enrichment.processor.geoIpDatabaseFileHelpText"
          defaultMessage="The database filename referring to one of the automatically downloaded GeoLite2 databases (GeoLite2-City.mmdb, GeoLite2-Country.mmdb, or GeoLite2-ASN.mmdb), or the name of a supported database file in the ingest-geoip config directory, or the name of a configured database (with the .mmdb suffix appended)."
        />
      ),
    },
    {
      field: 'properties',
      type: 'array',
      required: false,
      label: i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.geoIpPropertiesLabel',
        { defaultMessage: 'Properties' }
      ),
      helpText: (
        <FormattedMessage
          id="xpack.streams.streamDetailView.managementTab.enrichment.processor.geoIpPropertiesHelpText"
          defaultMessage="Controls what properties are added to the {targetField} based on the ip geolocation lookup."
          values={{ targetField: <EuiCode>target_field</EuiCode> }}
        />
      ),
    },
    {
      field: 'first_only',
      type: 'boolean',
      required: false,
      label: i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.geoIpFirstOnlyLabel',
        { defaultMessage: 'First only' }
      ),
      helpText: (
        <FormattedMessage
          id="xpack.streams.streamDetailView.managementTab.enrichment.processor.geoIpFirstOnlyHelpText"
          defaultMessage="If true only the first found ip geolocation data will be returned."
        />
      ),
    },
  ],
  fieldOptions: {
    fieldHelpText: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processor.geoIpFieldHelpText',
      { defaultMessage: 'The field to get the IP address from for the geographical lookup.' }
    ),
    includeCondition: false,
    includeIgnoreFailures: false,
    includeIgnoreMissing: true,
  },
};
