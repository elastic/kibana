/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiLink } from '@elastic/eui';
import type { DocLinksStart } from '@kbn/core/public';
import type { GeoipProcessor } from '@kbn/streamlang';
import { ALWAYS_CONDITION } from '@kbn/streamlang';
import type {
  ConfigDrivenProcessorConfiguration,
  FieldConfiguration,
  FieldOptions,
} from '../types';
import { getConvertFormStateToConfig, getConvertProcessorToFormState } from '../utils';

export type GeoipProcessorFormState = GeoipProcessor;

const defaultFormState: GeoipProcessorFormState = {
  action: 'geoip' as const,
  from: '',
  ignore_missing: false,
  where: ALWAYS_CONDITION,
  ignore_failure: false,
};

const fieldOptions: FieldOptions = {
  fieldKey: 'from',
  fieldHelpText: i18n.translate(
    'xpack.streams.streamDetailView.managementTab.enrichment.processor.geoipFieldHelpText',
    { defaultMessage: 'The field containing the IP address to enrich with geolocation data.' }
  ),
  includeCondition: true,
  includeIgnoreFailures: true,
  includeIgnoreMissing: true,
};

const fieldConfigurations: FieldConfiguration[] = [
  {
    field: 'to',
    type: 'string',
    required: false,
    label: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processor.geoipTargetFieldLabel',
      { defaultMessage: 'Target field' }
    ),
    helpText: (
      <FormattedMessage
        id="xpack.streams.streamDetailView.managementTab.enrichment.processor.geoipTargetFieldHelpText"
        defaultMessage="The field where the geoip data will be written. Defaults to 'geoip' if not specified."
      />
    ),
  },
];

export const geoipProcessorConfig: ConfigDrivenProcessorConfiguration<
  GeoipProcessorFormState,
  GeoipProcessor
> = {
  type: 'geoip' as const,
  inputDisplay: i18n.translate(
    'xpack.streams.streamDetailView.managementTab.enrichment.processor.geoipInputDisplay',
    {
      defaultMessage: 'GeoIP',
    }
  ),
  getDocUrl: (docLinks: DocLinksStart) => {
    return (
      <FormattedMessage
        id="xpack.streams.streamDetailView.managementTab.enrichment.processor.geoipHelpText"
        defaultMessage="{geoipLink} It adds information about the geographical location of an IPv4 or IPv6 address."
        values={{
          geoipLink: (
            <EuiLink
              data-test-subj="streamsAppAvailableProcessorsGeoipLink"
              external
              target="_blank"
              href={docLinks.links.ingest.geoip}
            >
              {i18n.translate('xpack.streams.availableProcessors.geoipLinkLabel', {
                defaultMessage: 'Enriches documents with geolocation data.',
              })}
            </EuiLink>
          ),
        }}
      />
    );
  },
  defaultFormState,
  convertFormStateToConfig: getConvertFormStateToConfig<GeoipProcessorFormState, GeoipProcessor>(
    fieldConfigurations,
    fieldOptions
  ),
  convertProcessorToFormState: getConvertProcessorToFormState<
    GeoipProcessor,
    GeoipProcessorFormState
  >(defaultFormState),
  fieldConfigurations,
  fieldOptions,
};
