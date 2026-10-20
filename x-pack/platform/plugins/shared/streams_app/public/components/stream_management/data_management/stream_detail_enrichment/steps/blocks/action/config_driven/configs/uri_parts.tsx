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
import { ALWAYS_CONDITION, URI_PARTS_DEFAULT_TARGET } from '@kbn/streamlang';
import type {
  ConfigDrivenProcessorConfiguration,
  FieldConfiguration,
  FieldOptions,
} from '../types';
import { getConvertFormStateToConfig, getConvertProcessorToFormState } from '../utils';

export type UriPartsProcessorFormState = UriPartsProcessor;

// Note on `ignore_missing: true` and `ignore_failure: true`:
// UI-friendly defaults that intentionally diverge from the YAML/transpiler
// defaults (both `false`, mirroring the Elasticsearch `uri_parts` ingest
// processor and the ES|QL URI_PARTS command). The schema in `kbn-streamlang`
// stays unopinionated (`z.optional(z.boolean())`) and the transpilers mirror
// the ingest processor's documented contract; the form layer instead picks
// the "skip docs without the source field / don't fail the pipeline" choice
// most users expect when adding a step through the UI. This is the same
// convention applied across config-driven processors in this directory
// (grok, dissect, convert, replace, redact, …) — see also
// `stream_detail_enrichment/utils.ts`.
const defaultFormState: UriPartsProcessorFormState = {
  action: 'uri_parts' as const,
  from: '',
  to: URI_PARTS_DEFAULT_TARGET,
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
    required: true,
    label: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processor.uriPartsTargetFieldLabel',
      { defaultMessage: 'Target prefix' }
    ),
    helpText: (
      <FormattedMessage
        id="xpack.streams.streamDetailView.managementTab.enrichment.processor.uriPartsTargetFieldHelpText"
        defaultMessage="Prefix where the extracted URI components are stored (e.g. {prefix}.scheme, {prefix}.domain, {prefix}.path)."
        values={{ prefix: <code>{'<prefix>'}</code> }}
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
