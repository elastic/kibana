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
import type { UriPartsProcessor } from '@kbn/streamlang';
import { ALWAYS_CONDITION } from '@kbn/streamlang';
import type {
  ConfigDrivenProcessorConfiguration,
  FieldConfiguration,
  FieldOptions,
} from '../types';
import { getConvertFormStateToConfig, getConvertProcessorToFormState } from '../utils';

export type UriPartsProcessorFormState = UriPartsProcessor;

const defaultFormState: UriPartsProcessorFormState = {
  action: 'uri_parts' as const,
  from: '',
  to: '',
  keep_original: true,
  remove_if_successful: false,
  ignore_missing: true,
  where: ALWAYS_CONDITION,
  ignore_failure: true,
};

const fieldOptions: FieldOptions = {
  fieldKey: 'from',
  fieldHelpText: i18n.translate(
    'xpack.streams.streamDetailView.managementTab.enrichment.processor.uriPartsFieldHelpText',
    { defaultMessage: 'Field containing the URI string to parse.' }
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
      'xpack.streams.streamDetailView.managementTab.enrichment.processor.uriPartsTargetFieldLabel',
      { defaultMessage: 'Target prefix' }
    ),
    helpText: (
      <FormattedMessage
        id="xpack.streams.streamDetailView.managementTab.enrichment.processor.uriPartsTargetFieldHelpText"
        defaultMessage="Prefix where the extracted URI components are stored (e.g. {prefix}.scheme, {prefix}.domain, {prefix}.path). Defaults to {defaultPrefix} when empty."
        values={{
          prefix: <code>{'<prefix>'}</code>,
          defaultPrefix: <code>{'url'}</code>,
        }}
      />
    ),
  },
  {
    field: 'keep_original',
    type: 'boolean',
    required: false,
    label: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processor.uriPartsKeepOriginalLabel',
      { defaultMessage: 'Keep original' }
    ),
    helpText: (
      <FormattedMessage
        id="xpack.streams.streamDetailView.managementTab.enrichment.processor.uriPartsKeepOriginalHelpText"
        defaultMessage="If enabled (default), the raw URI is preserved at {field}."
        values={{ field: <code>{'<prefix>.original'}</code> }}
      />
    ),
  },
  {
    field: 'remove_if_successful',
    type: 'boolean',
    required: false,
    label: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processor.uriPartsRemoveIfSuccessfulLabel',
      { defaultMessage: 'Remove source on success' }
    ),
    helpText: (
      <FormattedMessage
        id="xpack.streams.streamDetailView.managementTab.enrichment.processor.uriPartsRemoveIfSuccessfulHelpText"
        defaultMessage="If enabled, the source field is removed after a successful parse. The source field is kept when parsing fails."
      />
    ),
  },
];

export const uriPartsProcessorConfig: ConfigDrivenProcessorConfiguration<
  UriPartsProcessorFormState,
  UriPartsProcessor
> = {
  type: 'uri_parts' as const,
  inputDisplay: i18n.translate(
    'xpack.streams.streamDetailView.managementTab.enrichment.processor.uriPartsInputDisplay',
    {
      defaultMessage: 'URI parts',
    }
  ),
  getDocUrl: (docLinks: DocLinksStart) => {
    return (
      <FormattedMessage
        id="xpack.streams.streamDetailView.managementTab.enrichment.processor.uriPartsHelpText"
        defaultMessage="{uriPartsLink} into its components (scheme, domain, path, query, fragment, port, user info, and file extension)."
        values={{
          uriPartsLink: (
            <EuiLink
              data-test-subj="streamsAppAvailableProcessorsUriPartsLink"
              external
              target="_blank"
              href={docLinks.links.ingest.uriParts}
            >
              {i18n.translate('xpack.streams.availableProcessors.uriPartsLinkLabel', {
                defaultMessage: 'Parse a URI string',
              })}
            </EuiLink>
          ),
        }}
      />
    );
  },
  defaultFormState,
  // `to` is optional for uri_parts (defaults to "url"), but the shared config-driven
  // helper special-cases `from`/`to` as always-required and passes empty strings
  // through. That makes the DSL validator reject the step because
  // StreamlangTargetField is non-empty. Strip the empty `to` here so the transpilers
  // apply their default prefix.
  convertFormStateToConfig: (formState) => {
    const processor = getConvertFormStateToConfig<UriPartsProcessorFormState, UriPartsProcessor>(
      fieldConfigurations,
      fieldOptions
    )(formState);
    if (!processor.to) {
      const { to, ...rest } = processor;
      return rest as UriPartsProcessor;
    }
    return processor;
  },
  convertProcessorToFormState: getConvertProcessorToFormState<
    UriPartsProcessor,
    UriPartsProcessorFormState
  >(defaultFormState),
  fieldConfigurations,
  fieldOptions,
};
