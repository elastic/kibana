/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type USER_SETTINGS_TEMPLATE_SUFFIX,
  type PACKAGE_TEMPLATE_SUFFIX,
  OTEL_TEMPLATE_SUFFIX,
} from '../constants';

/**
 * Creates the base name for Elasticsearch assets (index template patterns,
 * related EPM naming) in the form `{type}-{dataset}`, optionally with an
 * OpenTelemetry suffix.
 *
 * When `isOtelInputType` is true (OTel `otelcol` data streams with
 * `enableOtelIntegrations`), Fleet appends `.{OTEL_TEMPLATE_SUFFIX}` (`otel`)
 * so patterns match bases such as `traces-generic.otel`. This applies only to
 * **Elasticsearch asset naming at package install** — not to the
 * `data_stream.dataset` string stored on package policies or emitted in
 * generated OTel collector OTTL (see `generateOtelcolConfig` and
 * `getFullInputStreams`).
 *
 * If the registry `dataset` already contained `.otel` as part of its logical
 * name, this function still appends the suffix; callers should not rely on
 * implicit deduplication.
 *
 * See: `dev_docs/data_streams.md` (OpenTelemetry integrations and the `.otel` suffix).
 */
export function getRegistryDataStreamAssetBaseName(
  dataStream: {
    dataset: string;
    type: string;
    hidden?: boolean;
  },
  isOtelInputType?: boolean
): string {
  const baseName = `${dataStream.type}-${dataStream.dataset.toLowerCase()}`;
  if (isOtelInputType) return `${baseName}.${OTEL_TEMPLATE_SUFFIX}`;
  return dataStream.hidden ? `.${baseName}` : baseName;
}

/**
 * Return the name for a component template
 */
export function getComponentTemplateNameForDatastream(
  dataStream: {
    dataset: string;
    type: string;
    hidden?: boolean;
  },
  suffix?: typeof PACKAGE_TEMPLATE_SUFFIX | typeof USER_SETTINGS_TEMPLATE_SUFFIX
): string {
  return `${getRegistryDataStreamAssetBaseName(dataStream)}${suffix ?? ''}`;
}

/**
 * Return the ingest pipeline name for a datastream
 */
export const getPipelineNameForDatastream = ({
  dataStream,
  packageVersion,
}: {
  dataStream: { dataset: string; type: string };
  packageVersion: string;
}): string => {
  return `${dataStream.type}-${dataStream.dataset.toLowerCase()}-${packageVersion}`;
};

/**
 * Return the custom user ingest pipeline name for a datastream
 */
export const getCustomPipelineNameForDatastream = (dataStream: {
  dataset: string;
  type: string;
}): string => {
  return `${dataStream.type}-${dataStream.dataset.toLowerCase()}@custom`;
};
