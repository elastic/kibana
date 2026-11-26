/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCode, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

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

export type OtelSpec = keyof typeof OTEL_SPEC_URLS;

const OTEL_SPEC_TITLES: Record<OtelSpec, string> = {
  otlpExporter: i18n.translate('xpack.fleet.settings.editOutputFlyout.otlpSpecTitle.otlpExporter', {
    defaultMessage: 'OTLP gRPC exporter',
  }),
  otlpHttpExporter: i18n.translate(
    'xpack.fleet.settings.editOutputFlyout.otlpSpecTitle.otlpHttpExporter',
    { defaultMessage: 'OTLP HTTP exporter' }
  ),
  exporterHelper: i18n.translate(
    'xpack.fleet.settings.editOutputFlyout.otlpSpecTitle.exporterHelper',
    { defaultMessage: 'exporter helper' }
  ),
  configGrpc: i18n.translate('xpack.fleet.settings.editOutputFlyout.otlpSpecTitle.configGrpc', {
    defaultMessage: 'gRPC client',
  }),
  configHttp: i18n.translate('xpack.fleet.settings.editOutputFlyout.otlpSpecTitle.configHttp', {
    defaultMessage: 'HTTP client',
  }),
  configTls: i18n.translate('xpack.fleet.settings.editOutputFlyout.otlpSpecTitle.configTls', {
    defaultMessage: 'TLS',
  }),
};

/**
 * Links to the specs of a section of settings. The specs describe the settings of a component as
 * a whole, so a section links to them once rather than every setting linking to them.
 */
export const OtlpSpecLinks: React.FunctionComponent<{ specs: OtelSpec[] }> = ({ specs }) => (
  <FormattedMessage
    id="xpack.fleet.settings.editOutputFlyout.otlpSpecLinks"
    defaultMessage="OpenTelemetry {version} specs: {links}."
    values={{
      version: OTEL_COLLECTOR_SPEC_VERSION,
      links: specs.map((spec, index) => (
        <React.Fragment key={spec}>
          {index > 0 && ', '}
          <EuiLink
            href={OTEL_SPEC_URLS[spec]}
            external
            target="_blank"
            data-test-subj={`settingsOutputsFlyout.otlpSpecLink.${spec}`}
          >
            {OTEL_SPEC_TITLES[spec]}
          </EuiLink>
        </React.Fragment>
      )),
    }}
  />
);

/** Hint text of an OTLP exporter setting: its default in the OpenTelemetry spec. */
export const OtlpDefaultHint: React.FunctionComponent<{
  /** The default value, shown as code. Leave out to describe the default with `defaultText`. */
  defaultValue?: string;
  defaultText?: React.ReactNode;
}> = ({ defaultValue, defaultText }) => (
  <FormattedMessage
    id="xpack.fleet.settings.editOutputFlyout.otlpDefaultHint"
    defaultMessage="Default: {defaultValue}."
    values={{
      defaultValue: defaultValue !== undefined ? <EuiCode>{defaultValue}</EuiCode> : defaultText,
    }}
  />
);
