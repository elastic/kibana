/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonIcon, EuiCopy, EuiFormRow, EuiSpacer, EuiTextArea } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SourceEndpoint } from './types';

const getEndpointLabel = (id: SourceEndpoint['id']): string => {
  switch (id) {
    case 'logs':
      return i18n.translate('xpack.streams.sources.logsEndpointLabel', {
        defaultMessage: 'Logs endpoint',
      });
    case 'metrics':
      return i18n.translate('xpack.streams.sources.metricsEndpointLabel', {
        defaultMessage: 'Metrics endpoint',
      });
    case 'traces':
      return i18n.translate('xpack.streams.sources.tracesEndpointLabel', {
        defaultMessage: 'Traces endpoint',
      });
    case 'bulk':
      return i18n.translate('xpack.streams.sources.bulkEndpointLabel', {
        defaultMessage: 'Bulk endpoint',
      });
    case 'bulkTarget':
      return i18n.translate('xpack.streams.sources.bulkTargetEndpointLabel', {
        defaultMessage: 'Bulk endpoint with a target index',
      });
    default:
      return i18n.translate('xpack.streams.sources.endpointLabel', {
        defaultMessage: 'Endpoint',
      });
  }
};

export const SourceEndpointField = ({
  endpoint,
  endpoints = [],
  showHelpText = true,
}: {
  endpoint?: string;
  endpoints?: SourceEndpoint[];
  showHelpText?: boolean;
}) => {
  const endpointUnavailableLabel = i18n.translate(
    'xpack.streams.sources.endpointUnavailableLabel',
    {
      defaultMessage: 'Endpoint unavailable',
    }
  );
  const displayedEndpoints: SourceEndpoint[] =
    endpoints.length > 0
      ? endpoints
      : [{ id: 'default', url: endpoint ?? endpointUnavailableLabel }];

  return (
    <>
      {displayedEndpoints.map(({ id, url }, index) => {
        const label = getEndpointLabel(id);
        const copyLabel = i18n.translate('xpack.streams.sources.copyNamedEndpointAriaLabel', {
          defaultMessage: 'Copy {label} to clipboard',
          values: { label },
        });
        return (
          <React.Fragment key={id}>
            {index > 0 && <EuiSpacer size="s" />}
            <EuiFormRow
              fullWidth
              label={label}
              labelAppend={
                endpoint ? (
                  <EuiCopy
                    textToCopy={url}
                    beforeMessage={copyLabel}
                    tooltipProps={{ disableScreenReaderOutput: true }}
                  >
                    {(copy) => (
                      <EuiButtonIcon
                        size="xs"
                        iconType="copy"
                        onClick={copy}
                        data-test-subj={
                          id === 'default'
                            ? 'streamsSourceEndpointCopyButton'
                            : `streamsSourceEndpointCopyButton-${id}`
                        }
                        aria-label={copyLabel}
                      />
                    )}
                  </EuiCopy>
                ) : undefined
              }
              helpText={
                showHelpText && index === displayedEndpoints.length - 1
                  ? i18n.translate('xpack.streams.sources.endpointHelpText', {
                      defaultMessage: 'Configure your sender to push data to this address.',
                    })
                  : undefined
              }
            >
              <EuiTextArea
                fullWidth
                readOnly
                rows={2}
                resize="none"
                value={url}
                aria-label={label}
                data-test-subj={
                  id === 'default'
                    ? 'streamsSourceEndpointValue'
                    : `streamsSourceEndpointValue-${id}`
                }
                disabled={!endpoint}
              />
            </EuiFormRow>
          </React.Fragment>
        );
      })}
    </>
  );
};
