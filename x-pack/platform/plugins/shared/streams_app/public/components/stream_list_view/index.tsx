/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiBetaBadge,
  EuiLink,
  EuiPageHeader,
  useEuiTheme,
  EuiButton,
  EuiFlexItem,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiSpacer,
  EuiModalFooter,
  EuiCodeBlock,
  EuiFieldText,
  EuiCallOut,
} from '@elastic/eui';
import { css } from '@emotion/react';
import {
  OBSERVABILITY_ONBOARDING_LOCATOR,
  ObservabilityOnboardingLocatorParams,
} from '@kbn/deeplinks-observability';
import useObservable from 'react-use/lib/useObservable';
import { useAbortController, useAbortableAsync } from '@kbn/react-hooks';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import { StreamsTreeTable } from './tree_table';
import { StreamsAppPageTemplate } from '../streams_app_page_template';
import { StreamsListEmptyPrompt } from './streams_list_empty_prompt';

export function StreamListView() {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient, status$ },
        share,
      },
    },
    core: { docLinks },
  } = useKibana();
  const onboardingLocator = share?.url.locators.get<ObservabilityOnboardingLocatorParams>(
    OBSERVABILITY_ONBOARDING_LOCATOR
  );
  const handleAddData = () => {
    onboardingLocator?.navigate({});
  };
  const streamsEnabled = useObservable(status$);
  const streamsListFetch = useStreamsAppFetch(
    async ({ signal }) => {
      const { streams } = await streamsRepositoryClient.fetch('GET /internal/streams', {
        signal,
      });
      return streams;
    },
    [streamsRepositoryClient]
  );

  const { euiTheme } = useEuiTheme();
  return (
    <>
      <EuiPageHeader
        paddingSize="l"
        css={css`
          background: ${euiTheme.colors.backgroundBasePlain};
          .euiSpacer--l {
            display: none !important;
          }
        `}
        pageTitle={
          <EuiFlexGroup
            alignItems="center"
            gutterSize="m"
            css={css`
              margin-bottom: ${euiTheme.size.s};
            `}
          >
            {i18n.translate('xpack.streams.streamsListView.pageHeaderTitle', {
              defaultMessage: 'Streams',
            })}
            <EuiBetaBadge
              label={i18n.translate('xpack.streams.streamsListView.betaBadgeLabel', {
                defaultMessage: 'Technical Preview',
              })}
              tooltipContent={i18n.translate('xpack.streams.streamsListView.betaBadgeDescription', {
                defaultMessage:
                  'This functionality is experimental and not supported. It may change or be removed at any time.',
              })}
              alignment="middle"
              size="s"
            />
          </EuiFlexGroup>
        }
      >
        <p
          css={css`
            margin: 0 0 ${euiTheme.size.s} 0;
            font-size: ${euiTheme.font.scale.s};
            color: ${euiTheme.colors.textSubdued};
            line-height: ${euiTheme.size.l};
          `}
        >
          {i18n.translate('xpack.streams.streamsListView.pageHeaderDescription', {
            defaultMessage:
              'Use Streams to organize and process your data into clear structured flows, and simplify routing, field extraction, and retention management.',
          })}{' '}
          <EuiLink target="_blank" href={docLinks.links.observability.logsStreams}>
            {i18n.translate('xpack.streams.streamsListView.pageHeaderDocsLink', {
              defaultMessage: 'See docs',
            })}
          </EuiLink>
        </p>
      </EuiPageHeader>

      <StreamsAppPageTemplate.Body grow>
        {streamsEnabled?.status === 'disabled' ? (
          <EuiFlexItem grow={false}>
            <EuiFlexGroup
              direction="column"
              alignItems="center"
              justifyContent="center"
              style={{ height: '300px' }}
            >
              <EuiFlexItem grow={false}>
                <CapturePrompt />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        ) : null}
        {!streamsListFetch.loading && !streamsListFetch.value?.length ? (
          <StreamsListEmptyPrompt onAddData={handleAddData} />
        ) : (
          <StreamsTreeTable loading={streamsListFetch.loading} streams={streamsListFetch.value} />
        )}
      </StreamsAppPageTemplate.Body>
    </>
  );
}

function CapturePrompt() {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient, status$ },
        share,
      },
    },
    core: { docLinks },
  } = useKibana();
  const [didEnable, setDidEnable] = React.useState(false);
  const [didCapture, setDidCapture] = React.useState(false);
  const [closedModal, setClosedModal] = React.useState(false);
  const [capturePattern, setCapturePattern] = React.useState('');
  const enableSignal = useAbortController().signal;

  const matchingDatastreams = useAbortableAsync(
    async ({ signal }) => {
      return streamsRepositoryClient.fetch('GET /internal/streams/_list_data_streams/{pattern}', {
        signal,
        params: {
          path: { pattern: capturePattern || '*' },
        },
      });
    },
    [streamsRepositoryClient, capturePattern]
  );

  if (!didEnable) {
    return (
      <EuiButton
        fill
        onClick={async () => {
          await streamsRepositoryClient.fetch('POST /api/streams/_enable 2023-10-31', {
            signal: enableSignal,
          });
          setDidEnable(true);
        }}
      >
        Enable wired streams (they are so cool!)
      </EuiButton>
    );
  }
  if (closedModal) {
    return null;
  }
  return (
    <EuiModal onClose={() => setClosedModal(true)} aria-label="Onboarding wired streams">
      <EuiModalHeader>
        <EuiModalHeaderTitle>Welcome to wired streams!</EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        Wired streams allow you to ...
        <EuiSpacer />
        To send data to wired streams, you can configure your shippers:
        <EuiCodeBlock language="bash">
          {`# Filebeat example
          filebeat.inputs:
            - type: log
              paths:
                - /var/log/*.log
          output.elasticsearch:
            hosts: ["http://localhost:9200"]
            logs_stream: true

# Logstash example
          output {
            elasticsearch {
              hosts => ["http://localhost:9200"]
              index => "logs"
          }
        }

# OTel example (via logsstreamprocessor)
          otelcol:
            processors:
              logsstreamprocessor:
                logs_stream: true
            exporters:
              elasticsearch:
                endpoints: ["http://localhost:9200"]
            service:
              pipelines:
                logs:
                  processors: [logsstreamprocessor]
                  exporters: [elasticsearch]
      `}
        </EuiCodeBlock>
        {didCapture && (
          <EuiCallOut color="success">
            You are now redirecting data over to the logs stream
          </EuiCallOut>
        )}
        For existing streams, you can also configure a capture pattern to start capturing data:
        <EuiFieldText
          placeholder="Enter capture pattern"
          value={capturePattern}
          onChange={(e) => setCapturePattern(e.target.value)}
        />
        Matching datastreams:
        {matchingDatastreams.value?.data_streams.length ? (
          <ul>
            {matchingDatastreams.value.data_streams.map((ds) => (
              <li key={ds}>{ds}</li>
            ))}
          </ul>
        ) : (
          <p>No matching datastreams found.</p>
        )}
        <EuiButton
          onClick={async () => {
            setDidCapture(false);
            await streamsRepositoryClient.fetch('PUT /api/streams/{name}/_ingest 2023-10-31', {
              signal: enableSignal,
              params: {
                path: { name: 'logs' },
                body: {
                  ingest: {
                    lifecycle: {
                      dsl: {},
                    },
                    processing: [],
                    wired: {
                      fields: {
                        '@timestamp': {
                          type: 'date',
                        },
                        'stream.name': {
                          type: 'system',
                        },
                        'scope.dropped_attributes_count': {
                          type: 'long',
                        },
                        dropped_attributes_count: {
                          type: 'long',
                        },
                        'resource.dropped_attributes_count': {
                          type: 'long',
                        },
                        'resource.schema_url': {
                          type: 'keyword',
                        },
                        'scope.name': {
                          type: 'keyword',
                        },
                        'scope.schema_url': {
                          type: 'keyword',
                        },
                        'scope.version': {
                          type: 'keyword',
                        },
                        observed_timestamp: {
                          type: 'date',
                        },
                        trace_id: {
                          type: 'keyword',
                        },
                        span_id: {
                          type: 'keyword',
                        },
                        event_name: {
                          type: 'keyword',
                        },
                        severity_text: {
                          type: 'keyword',
                        },
                        'body.text': {
                          type: 'match_only_text',
                        },
                        severity_number: {
                          type: 'long',
                        },
                        'resource.attributes.host.name': {
                          type: 'keyword',
                        },
                      },

                      capture_pattern: capturePattern,
                      routing: [],
                    },
                  },
                },
              },
            });

            setDidCapture(true);
          }}
        >
          Start capturing
        </EuiButton>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButton
          onClick={() => {
            setClosedModal(true);
            if (didEnable) {
              window.location.reload();
            }
          }}
          fill
        >
          Close
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
}
