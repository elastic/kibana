/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { Streams } from '@kbn/streams-schema';
import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiSpacer } from '@elastic/eui';
import type { IndexManagementLocatorParams } from '@kbn/index-management-shared-types';
import { useStreamsPrivileges } from '../../../hooks/use_streams_privileges';
import { StreamSystemConfiguration } from './stream_system_configuration';
import { useStreamsAppFetch } from '../../../hooks/use_streams_app_fetch';
import { useKibana } from '../../../hooks/use_kibana';
import { ComponentTemplatePanel } from './component_template_panel';
import { IndexTemplateDetails } from './index_template_details';
import { IngestPipelineDetails } from './ingest_pipeline_details';
import { DataStreamDetails } from './data_stream_details';
import { IndexConfiguration } from './advanced_view/index_configuration';
import { DeleteStreamPanel } from './advanced_view/delete_stream';
import { Row, RowMetadata } from './advanced_view/row';

export function UnmanagedElasticsearchAssets({
  definition,
  refreshDefinition,
}: {
  definition: Streams.ClassicStream.GetResponse;
  refreshDefinition: () => void;
}) {
  const {
    appParams: { history },
    dependencies: {
      start: {
        indexManagement,
        ingestPipelines,
        share,
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const {
    features: { significantEvents },
  } = useStreamsPrivileges();

  const unmanagedAssetsDetailsFetch = useStreamsAppFetch(
    ({ signal }) => {
      return streamsRepositoryClient.fetch('GET /internal/streams/{name}/_unmanaged_assets', {
        signal,
        params: {
          path: {
            name: definition.stream.name,
          },
        },
      });
    },
    [definition.stream.name, streamsRepositoryClient]
  );

  const indexManagementLocator = share.url.locators.get<IndexManagementLocatorParams>(
    'INDEX_MANAGEMENT_LOCATOR_ID'
  );

  const [currentFlyout, setCurrentFlyout] = useState<
    | {
        type: 'data_stream' | 'component_template' | 'index_template' | 'ingest_pipeline';
        name: string;
      }
    | undefined
  >(undefined);

  const ComponentTemplateFlyout = useMemo(
    () => indexManagement.getComponentTemplateFlyoutComponent({ history }),
    [history, indexManagement]
  );
  const DatastreamFlyout = useMemo(
    () => indexManagement.getDatastreamFlyoutComponent({ history }),
    [history, indexManagement]
  );
  const IndexTemplateFlyout = useMemo(
    () => indexManagement.getIndexTemplateFlyoutComponent({ history }),
    [history, indexManagement]
  );
  const IngestPipelineFlyout = useMemo(
    () => ingestPipelines.getIngestPipelineFlyoutComponent({ history }),
    [history, ingestPipelines]
  );

  if (!definition.data_stream_exists) {
    return (
      <EuiCallOut
        announceOnMount
        title={i18n.translate('xpack.streams.unmanagedStreamOverview.missingDatastream.title', {
          defaultMessage: 'Data stream missing',
        })}
        color="danger"
        iconType="error"
      >
        <p>
          {i18n.translate('xpack.streams.unmanagedStreamOverview.missingDatastream.description', {
            defaultMessage:
              'The underlying Elasticsearch data stream for this classic stream is missing. Recreate the data stream to restore the stream by sending data before using the management features.',
          })}
        </p>
      </EuiCallOut>
    );
  }

  return (
    <>
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem>
          {significantEvents?.available && (
            <StreamSystemConfiguration definition={definition.stream} />
          )}
        </EuiFlexItem>
        <IndexConfiguration definition={definition} refreshDefinition={refreshDefinition}>
          <Row
            left={
              <RowMetadata
                label={i18n.translate(
                  'xpack.streams.streamDetailView.unmanagedStreamOverview.indexTemplateTitle',
                  {
                    defaultMessage: 'Index template',
                  }
                )}
                description={i18n.translate(
                  'xpack.streams.streamDetailView.unmanagedStreamOverview.indexTemplateDescription',
                  {
                    defaultMessage:
                      'Use composable index and component templates to automatically apply settings, mappings, and aliases to indices',
                  }
                )}
              />
            }
            right={
              <IndexTemplateDetails
                indexTemplate={unmanagedAssetsDetailsFetch.value?.indexTemplate}
                onFlyoutOpen={(name) => setCurrentFlyout({ type: 'index_template', name })}
              />
            }
          />

          <EuiHorizontalRule margin="m" />

          <Row
            left={
              <RowMetadata
                label={i18n.translate(
                  'xpack.streams.streamDetailView.unmanagedStreamOverview.pipelineTitle',
                  {
                    defaultMessage: 'Pipeline',
                  }
                )}
                description={''}
              />
            }
            right={
              <IngestPipelineDetails
                ingestPipeline={unmanagedAssetsDetailsFetch.value?.ingestPipeline}
                onFlyoutOpen={(name) => setCurrentFlyout({ type: 'ingest_pipeline', name })}
              />
            }
          />

          <EuiHorizontalRule margin="m" />

          <Row
            left={
              <RowMetadata
                label={i18n.translate(
                  'xpack.streams.streamDetailView.unmanagedStreamOverview.dataStreamTitle',
                  {
                    defaultMessage: 'Data stream',
                  }
                )}
                description={i18n.translate(
                  'xpack.streams.streamDetailView.unmanagedStreamOverview.dataStreamDescription',
                  {
                    defaultMessage:
                      'Data streams store time-series data across multiple indices and can be created from index templates',
                  }
                )}
              />
            }
            right={
              <DataStreamDetails
                indexManagementLocator={indexManagementLocator}
                dataStream={unmanagedAssetsDetailsFetch.value?.dataStream}
                onFlyoutOpen={(name) => setCurrentFlyout({ type: 'data_stream', name })}
              />
            }
          />

          <EuiHorizontalRule margin="m" />
        </IndexConfiguration>

        <EuiFlexItem grow={false}>
          <ComponentTemplatePanel
            componentTemplates={unmanagedAssetsDetailsFetch.value?.componentTemplates}
            onFlyoutOpen={(name) => setCurrentFlyout({ type: 'component_template', name })}
          />
        </EuiFlexItem>

        <DeleteStreamPanel definition={definition} />
        <EuiSpacer size="s" />
      </EuiFlexGroup>
      {currentFlyout && currentFlyout.type === 'component_template' && (
        <ComponentTemplateFlyout
          onClose={() => setCurrentFlyout(undefined)}
          componentTemplateName={currentFlyout.name}
        />
      )}
      {currentFlyout && currentFlyout.type === 'data_stream' && (
        <DatastreamFlyout
          onClose={() => setCurrentFlyout(undefined)}
          datastreamName={currentFlyout.name}
        />
      )}
      {currentFlyout && currentFlyout.type === 'index_template' && (
        <IndexTemplateFlyout
          onClose={() => setCurrentFlyout(undefined)}
          indexTemplateName={currentFlyout.name}
          reload={refreshDefinition}
        />
      )}
      {currentFlyout && currentFlyout.type === 'ingest_pipeline' && (
        <IngestPipelineFlyout
          onClose={() => setCurrentFlyout(undefined)}
          ingestPipelineName={currentFlyout.name}
          reload={refreshDefinition}
        />
      )}
    </>
  );
}
