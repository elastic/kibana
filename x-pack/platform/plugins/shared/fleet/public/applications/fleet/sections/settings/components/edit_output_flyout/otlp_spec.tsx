/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCode, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

/** The collector version that EDOT pins (elastic-agent/internal/edot/go.mod), and that the OTLP output schema matches. */
export const OTEL_COLLECTOR_SPEC_VERSION = 'v0.155.0';

const OTEL_COLLECTOR_SPEC_BASE_URL = `https://github.com/open-telemetry/opentelemetry-collector/blob/${OTEL_COLLECTOR_SPEC_VERSION}`;

/** The versioned specs of the OTLP exporter settings. */
export const OTEL_SPEC_URLS = {
  otlpExporter: `${OTEL_COLLECTOR_SPEC_BASE_URL}/exporter/otlpexporter/README.md`,
  otlpHttpExporter: `${OTEL_COLLECTOR_SPEC_BASE_URL}/exporter/otlphttpexporter/README.md`,
  exporterHelper: `${OTEL_COLLECTOR_SPEC_BASE_URL}/exporter/exporterhelper/README.md`,
  configGrpc: `${OTEL_COLLECTOR_SPEC_BASE_URL}/config/configgrpc/README.md`,
  configHttp: `${OTEL_COLLECTOR_SPEC_BASE_URL}/config/confighttp/README.md`,
  configTls: `${OTEL_COLLECTOR_SPEC_BASE_URL}/config/configtls/README.md`,
} as const;

export const OtlpSpecLink: React.FunctionComponent<{ specUrl: string }> = ({ specUrl }) => (
  <EuiLink href={specUrl} external target="_blank">
    <FormattedMessage
      id="xpack.fleet.settings.editOutputFlyout.otlpSpecLinkText"
      defaultMessage="OpenTelemetry {version} spec"
      values={{ version: OTEL_COLLECTOR_SPEC_VERSION }}
    />
  </EuiLink>
);

/**
 * Hint text of an OTLP exporter setting: its default in the OpenTelemetry spec, linked to the
 * spec of the collector version that EDOT uses.
 */
export const OtlpSpecDefaultHint: React.FunctionComponent<{
  /** The default value, shown as code. Leave out to describe the default with `defaultText`. */
  defaultValue?: string;
  defaultText?: React.ReactNode;
  specUrl: string;
}> = ({ defaultValue, defaultText, specUrl }) => (
  <FormattedMessage
    id="xpack.fleet.settings.editOutputFlyout.otlpSpecDefaultHint"
    defaultMessage="Default: {defaultValue}. See the {specLink}."
    values={{
      defaultValue: defaultValue !== undefined ? <EuiCode>{defaultValue}</EuiCode> : defaultText,
      specLink: <OtlpSpecLink specUrl={specUrl} />,
    }}
  />
);
