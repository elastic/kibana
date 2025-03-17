/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { UnwiredStreamGetResponse } from '@kbn/streams-schema';
import { EuiCallOut, EuiFlexGroup, EuiListGroup, EuiText } from '@elastic/eui';
import { useStreamsAppParams } from '../../../hooks/use_streams_app_params';
import { RedirectTo } from '../../redirect_to';
import { StreamDetailEnrichment } from '../stream_detail_enrichment';
import { useKibana } from '../../../hooks/use_kibana';
import { ManagementTabs, Wrapper } from './wrapper';
import { StreamDetailLifecycle } from '../stream_detail_lifecycle';

type ManagementSubTabs = 'enrich' | 'overview' | 'lifecycle';

function isValidManagementSubTab(value: string): value is ManagementSubTabs {
  return ['enrich', 'overview', 'lifecycle'].includes(value);
}

export function ClassicStreamDetailManagement({
  definition,
  refreshDefinition,
}: {
  definition: UnwiredStreamGetResponse;
  refreshDefinition: () => void;
}) {
  const {
    path: { key, subtab },
  } = useStreamsAppParams('/{key}/management/{subtab}');

  const tabs: ManagementTabs = {
    overview: {
      content: (
        <UnmanagedStreamOverview definition={definition} refreshDefinition={refreshDefinition} />
      ),
      label: i18n.translate('xpack.streams.streamDetailView.overviewTab', {
        defaultMessage: 'Overview',
      }),
    },
  };

  if (definition.data_stream_exists) {
    tabs.enrich = {
      content: (
        <StreamDetailEnrichment definition={definition} refreshDefinition={refreshDefinition} />
      ),
      label: i18n.translate('xpack.streams.streamDetailView.enrichmentTab', {
        defaultMessage: 'Extract field',
      }),
    };

    tabs.lifecycle = {
      content: (
        <StreamDetailLifecycle definition={definition} refreshDefinition={refreshDefinition} />
      ),
      label: i18n.translate('xpack.streams.streamDetailView.lifecycleTab', {
        defaultMessage: 'Data retention',
      }),
    };
  }

  if (!isValidManagementSubTab(subtab)) {
    return (
      <RedirectTo
        path="/{key}/management/{subtab}"
        params={{ path: { key, subtab: 'overview' } }}
      />
    );
  }

  return <Wrapper tabs={tabs} streamId={key} subtab={subtab} />;
}

function UnmanagedStreamOverview({
  definition,
  refreshDefinition,
}: {
  definition: UnwiredStreamGetResponse;
  refreshDefinition: () => void;
}) {
  const {
    appParams: { history },
    dependencies: {
      start: { indexManagement, ingestPipelines },
    },
    core: {
      http: { basePath },
    },
  } = useKibana();

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

  const groupedAssets = (definition.elasticsearch_assets ?? []).reduce((acc, asset) => {
    const title = assetToTitle(asset);
    if (title) {
      acc[title] = acc[title] ?? [];
      acc[title].push(asset);
    }
    return acc;
  }, {} as Record<string, Array<{ type: string; id: string }>>);
  if (!definition.data_stream_exists) {
    return (
      <EuiCallOut
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
          })}{' '}
        </p>
      </EuiCallOut>
    );
  }
  return (
    <>
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiText>
          <p>
            {i18n.translate('xpack.streams.streamDetailView.unmanagedStreamOverview', {
              defaultMessage:
                'This stream is not managed. Follow the links to stack management to change the related Elasticsearch objects.',
            })}
          </p>
        </EuiText>
        {Object.entries(groupedAssets).map(([title, assets]) => (
          <div key={title}>
            <EuiText>
              <h3>{title}</h3>
            </EuiText>
            <EuiListGroup
              listItems={assets.map((asset) => ({
                label: asset.id,
                key: asset.id,
                href: basePath.prepend(assetToLink(asset)),
                onClick: (e) => {
                  if (asset.type === 'component_template') {
                    e.preventDefault();
                    setCurrentFlyout({ type: 'component_template', name: asset.id });
                  }
                  if (asset.type === 'data_stream') {
                    e.preventDefault();
                    setCurrentFlyout({ type: 'data_stream', name: asset.id });
                  }
                  if (asset.type === 'index_template') {
                    e.preventDefault();
                    setCurrentFlyout({ type: 'index_template', name: asset.id });
                  }
                  if (asset.type === 'ingest_pipeline') {
                    e.preventDefault();
                    setCurrentFlyout({ type: 'ingest_pipeline', name: asset.id });
                  }
                },
                iconType: 'index',
              }))}
            />
          </div>
        ))}
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

function assetToLink(asset: { type: string; id: string }) {
  switch (asset.type) {
    case 'index_template':
      return `/app/management/data/index_management/templates/${asset.id}`;
    case 'component_template':
      return `/app/management/data/index_management/component_templates/${asset.id}`;
    case 'data_stream':
      return `/app/management/data/index_management/data_streams/${asset.id}`;
    case 'ingest_pipeline':
      return `/app/management/ingest/ingest_pipelines?pipeline=${asset.id}`;
    default:
      return '';
  }
}

function assetToTitle(asset: { type: string; id: string }) {
  switch (asset.type) {
    case 'index_template':
      return i18n.translate('xpack.streams.streamDetailView.indexTemplate', {
        defaultMessage: 'Index template',
      });
    case 'component_template':
      return i18n.translate('xpack.streams.streamDetailView.componentTemplate', {
        defaultMessage: 'Component template',
      });
    case 'data_stream':
      return i18n.translate('xpack.streams.streamDetailView.dataStream', {
        defaultMessage: 'Data stream',
      });
    case 'ingest_pipeline':
      return i18n.translate('xpack.streams.streamDetailView.ingestPipeline', {
        defaultMessage: 'Ingest pipeline',
      });
    default:
      return '';
  }
}
