/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { PropsWithChildren } from 'react';
import {
  EuiFlyoutResizable,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiSpacer,
  EuiText,
  EuiCallOut,
  EuiFlexGroup,
  EuiAccordion,
  EuiEmptyPrompt,
  EuiCheckableCard,
  EuiButtonIcon,
  EuiBadge,
  EuiFlexItem,
  EuiButton,
  EuiContextMenu,
  EuiPopover,
  EuiFormRow,
  EuiFieldText,
  EuiFieldTextProps,
  EuiProgress,
  EuiCode,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import { useBoolean } from '@kbn/react-hooks';
import useAsync from 'react-use/lib/useAsync';
import { Query, TimeRange } from '@kbn/es-query';
import { CodeEditor } from '@kbn/code-editor';
import { FormattedMessage } from '@kbn/i18n-react';
import { isSchema } from '@kbn/streams-schema';
import { useKibana } from '../../../../hooks/use_kibana';
import {
  EnrichmentDataSource,
  customSamplesDataSourceDocumentsSchema,
} from '../../../../../common/url_schema';
import { useDiscardConfirm } from '../../../../hooks/use_discard_confirm';
import {
  useStreamEnrichmentEvents,
  useStreamEnrichmentSelector,
} from '../state_management/stream_enrichment_state_machine';
import {
  DataSourceActorRef,
  useDataSourceSelector,
} from '../state_management/data_source_state_machine';
import { AssetImage } from '../../../asset_image';
import { PreviewTable } from '../../preview_table';
import {
  CustomSamplesDataSourceWithUIAttributes,
  KqlSamplesDataSourceWithUIAttributes,
} from '../types';
import { UncontrolledStreamsAppSearchBar } from '../../../streams_app_search_bar/uncontrolled_streams_app_bar';
import { deserializeJson, serializeXJson } from '../helpers';

interface DataSourcesFlyoutProps {
  onClose: () => void;
}

export const DataSourcesFlyout = ({ onClose }: DataSourcesFlyoutProps) => {
  const { addDataSource } = useStreamEnrichmentEvents();

  const dataSourcesActorRefs = useStreamEnrichmentSelector(
    (snapshot) => snapshot.context.dataSourcesRefs
  );

  return (
    <EuiFlyoutResizable onClose={onClose} size="m">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            {i18n.translate(
              'xpack.streams.streamDetailView.managementTab.enrichment.dataSourcesFlyout.title',
              { defaultMessage: 'Manage simulation data sources' }
            )}
          </h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText component="p" color="subdued">
          {i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.dataSourcesFlyout.subtitle',
            {
              defaultMessage:
                'Configure data sources for simulation and testing. Each data source provides sample data for your analysis.',
            }
          )}
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody
        banner={
          <EuiCallOut
            size="s"
            title={i18n.translate(
              'xpack.streams.streamDetailView.managementTab.enrichment.dataSourcesFlyout.infoDescription',
              {
                defaultMessage:
                  'Active data sources will be used for simulation. You can toggle data sources on/off without removing them.',
              }
            )}
            iconType="pin"
          />
        }
      >
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiTitle size="s">
            <h3>
              {i18n.translate(
                'xpack.streams.streamDetailView.managementTab.enrichment.dataSourcesFlyout.infoTitle',
                { defaultMessage: 'Data sources' }
              )}
            </h3>
          </EuiTitle>
          <DataSourcesContextMenu onAddDataSource={addDataSource} />
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <EuiFlexGroup component="ul" direction="column" gutterSize="m">
          {dataSourcesActorRefs.map((dataSourceRef) => (
            <EuiFlexItem key={dataSourceRef.id} component="li">
              <DataSource dataSourceRef={dataSourceRef} />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiFlyoutBody>
    </EuiFlyoutResizable>
  );
};

const DataSourcesContextMenu = ({
  onAddDataSource,
}: {
  onAddDataSource: (dataSource: EnrichmentDataSource) => void;
}) => {
  const [isOpen, { toggle: toggleMenu, off: closeMenu }] = useBoolean();
  return (
    <EuiPopover
      id="data-sources-menu"
      button={
        <EuiButton size="s" iconType="arrowDown" iconSide="right" onClick={toggleMenu}>
          {i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.dataSourcesFlyout.addDataSource.menu',
            { defaultMessage: 'Add data source' }
          )}
        </EuiButton>
      }
      isOpen={isOpen}
      closePopover={closeMenu}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenu
        initialPanelId="data-source-options"
        panels={[
          {
            id: 'data-source-options',
            items: [
              {
                name: i18n.translate(
                  'xpack.streams.streamDetailView.managementTab.enrichment.dataSourcesFlyout.addDataSource.menu.addKqlDataSource',
                  { defaultMessage: 'Add KQL search samples' }
                ),
                icon: 'search',
                onClick: () => {
                  onAddDataSource({
                    type: 'kql-samples',
                    name: '',
                    enabled: true,
                    time: {
                      from: 'now-15m',
                      to: 'now',
                    },
                    filters: [],
                    query: {
                      language: 'kuery',
                      query: '',
                    },
                  });
                  closeMenu();
                },
              },
              {
                name: i18n.translate(
                  'xpack.streams.streamDetailView.managementTab.enrichment.dataSourcesFlyout.addDataSource.menu.addCustomSamples',
                  { defaultMessage: 'Add custom docs samples' }
                ),
                icon: 'visText',
                onClick: () => {
                  onAddDataSource({
                    type: 'custom-samples',
                    name: '',
                    enabled: true,
                    documents: [],
                  });
                  closeMenu();
                },
              },
            ],
          },
        ]}
      />
    </EuiPopover>
  );
};

const DataSource = ({ dataSourceRef }: { dataSourceRef: DataSourceActorRef }) => {
  const dataSourceType = useDataSourceSelector(
    dataSourceRef,
    (snapshot) => snapshot.context.dataSource.type
  );

  if (dataSourceType === 'random-samples') {
    return <RandomSamplesDataSourceCard dataSourceRef={dataSourceRef} />;
  } else if (dataSourceType === 'kql-samples') {
    return <KqlSamplesDataSourceCard dataSourceRef={dataSourceRef} />;
  } else if (dataSourceType === 'custom-samples') {
    return <CustomSamplesDataSourceCard dataSourceRef={dataSourceRef} />;
  }

  return null;
};

const RandomSamplesDataSourceCard = ({ dataSourceRef }: { dataSourceRef: DataSourceActorRef }) => {
  return (
    <DataSourceCard
      dataSourceRef={dataSourceRef}
      title={i18n.translate('xpack.streams.enrichment.dataSources.randomSamples.name', {
        defaultMessage: 'Random samples from stream',
      })}
      subtitle={i18n.translate('xpack.streams.enrichment.dataSources.randomSamples.subtitle', {
        defaultMessage: 'Automatically samples random data from the stream.',
      })}
    >
      <EuiCallOut
        iconType="iInCircle"
        size="s"
        title={i18n.translate('xpack.streams.enrichment.dataSources.randomSamples.callout', {
          defaultMessage:
            'The random samples data source cannot be deleted to guarantee available samples for the simulation. You can still disable it if you want to focus on other data sources samples.',
        })}
      />
      <EuiSpacer size="m" />
    </DataSourceCard>
  );
};

const KqlSamplesDataSourceCard = ({ dataSourceRef }: { dataSourceRef: DataSourceActorRef }) => {
  const { data } = useKibana().dependencies.start;
  const definition = useStreamEnrichmentSelector((state) => state.context.definition);
  const dataSource = useDataSourceSelector(
    dataSourceRef,
    (snapshot) => snapshot.context.dataSource as KqlSamplesDataSourceWithUIAttributes
  );

  const isDisabled = useDataSourceSelector(dataSourceRef, (snapshot) =>
    snapshot.matches('disabled')
  );

  const { value: streamDataView } = useAsync(() =>
    data.dataViews.create({
      title: definition.stream.name,
      timeFieldName: '@timestamp',
    })
  );

  const handleChange = (params: Partial<KqlSamplesDataSourceWithUIAttributes>) => {
    dataSourceRef.send({ type: 'dataSource.change', dataSource: { ...dataSource, ...params } });
  };

  const handleQueryChange = ({ query, dateRange }: { query?: Query; dateRange: TimeRange }) =>
    handleChange({
      query: query as KqlSamplesDataSourceWithUIAttributes['query'],
      time: dateRange,
    });

  return (
    <DataSourceCard
      dataSourceRef={dataSourceRef}
      title={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.dataSourcesFlyout.kqlDataSource.defaultName',
        { defaultMessage: 'KQL search samples' }
      )}
      subtitle={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.dataSourcesFlyout.kqlDataSource.subtitle',
        { defaultMessage: 'Sample data using KQL query syntax.' }
      )}
    >
      <NameField
        onChange={(event) => handleChange({ name: event.target.value })}
        value={dataSource.name}
        disabled={isDisabled}
      />
      <EuiSpacer />
      {streamDataView && (
        <>
          <UncontrolledStreamsAppSearchBar
            dateRangeFrom={dataSource.time.from}
            dateRangeTo={dataSource.time.to}
            filters={dataSource.filters}
            indexPatterns={[streamDataView]}
            isDisabled={isDisabled}
            onFiltersUpdated={(filters) => handleChange({ filters })}
            onQueryChange={handleQueryChange}
            onQuerySubmit={handleQueryChange}
            query={dataSource.query}
            showDatePicker
            showFilterBar
            showQueryInput
          />
          <EuiSpacer size="s" />
        </>
      )}
    </DataSourceCard>
  );
};

const CustomSamplesDataSourceCard = ({ dataSourceRef }: { dataSourceRef: DataSourceActorRef }) => {
  const dataSource = useDataSourceSelector(
    dataSourceRef,
    (snapshot) => snapshot.context.dataSource as CustomSamplesDataSourceWithUIAttributes
  );

  const isDisabled = useDataSourceSelector(dataSourceRef, (snapshot) =>
    snapshot.matches('disabled')
  );

  const handleChange = (params: Partial<CustomSamplesDataSourceWithUIAttributes>) => {
    dataSourceRef.send({ type: 'dataSource.change', dataSource: { ...dataSource, ...params } });
  };

  return (
    <DataSourceCard
      dataSourceRef={dataSourceRef}
      title={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.dataSourcesFlyout.customSamples.defaultName',
        { defaultMessage: 'Custom samples' }
      )}
      subtitle={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.dataSourcesFlyout.customSamples.subtitle',
        { defaultMessage: 'Manually defined sample documents.' }
      )}
    >
      <EuiCallOut
        iconType="iInCircle"
        size="s"
        title={i18n.translate('xpack.streams.enrichment.dataSources.customSamples.callout', {
          defaultMessage:
            'The custom samples data source cannot be persisted. It will be lost when you leave this page.',
        })}
      />
      <EuiSpacer size="m" />
      <NameField
        onChange={(event) => handleChange({ name: event.target.value })}
        value={dataSource.name}
        disabled={isDisabled}
      />
      <EuiFormRow
        label={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.dataSourcesFlyout.customSamples.label',
          { defaultMessage: 'Documents' }
        )}
        helpText={
          <FormattedMessage
            id="xpack.streams.streamDetailView.managementTab.enrichment.dataSourcesFlyout.customSamples.helpText"
            defaultMessage="Use JSON format: {code}"
            values={{
              code: (
                <EuiCode>
                  {JSON.stringify([
                    {
                      foo: 'bar',
                      foo2: 'baz',
                    },
                  ])}
                </EuiCode>
              ),
            }}
          />
        }
        isDisabled={isDisabled}
        fullWidth
      >
        <CodeEditor
          height={200}
          value={serializeXJson(dataSource.documents, '[]')}
          onChange={(value) => {
            const documents = deserializeJson(value);
            if (isSchema(customSamplesDataSourceDocumentsSchema, documents)) {
              handleChange({ documents });
            }
          }}
          languageId="xjson"
          options={{
            tabSize: 2,
            automaticLayout: true,
            readOnly: isDisabled,
          }}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
    </DataSourceCard>
  );
};

const NameField = (props: Omit<EuiFieldTextProps, 'name'>) => {
  return (
    <EuiFormRow
      fullWidth
      label={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.dataSourcesFlyout.dataSourceCard.name.label',
        { defaultMessage: 'Name' }
      )}
      helpText={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.dataSourcesFlyout.dataSourceCard.name.helpText',
        { defaultMessage: 'Describe what samples the data source loads.' }
      )}
    >
      <EuiFieldText fullWidth name="name" {...props} />
    </EuiFormRow>
  );
};

const DataSourceCard = ({
  children,
  dataSourceRef,
  title,
  subtitle,
}: PropsWithChildren<{
  dataSourceRef: DataSourceActorRef;
  title?: string;
  subtitle?: string;
}>) => {
  const dataSourceState = useDataSourceSelector(dataSourceRef, (snapshot) => snapshot);

  const { data: previewDocs, dataSource } = dataSourceState.context;

  const canDeleteDataSource = dataSourceState.can({ type: 'dataSource.delete' });
  const isEnabled = dataSourceState.matches('enabled');
  const isLoading =
    dataSourceState.matches({ enabled: 'loadingData' }) ||
    dataSourceState.matches({ enabled: 'debouncingChanges' });

  const toggleActivity = () => {
    dataSourceRef.send({ type: 'dataSource.toggleActivity' });
  };

  const deleteDataSource = useDiscardConfirm(
    () => {
      dataSourceRef.send({ type: 'dataSource.delete' });
    },
    {
      title: i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.dataSourcesFlyout.dataSourceCard.delete.title',
        { defaultMessage: 'Delete data source?' }
      ),
      message: i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.dataSourcesFlyout.dataSourceCard.delete.message',
        { defaultMessage: 'Deleted data sources will be lost and you will have to recreate it.' }
      ),
      cancelButtonText: i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.dataSourcesFlyout.dataSourceCard.delete.cancelButtonText',
        { defaultMessage: 'Cancel' }
      ),
      confirmButtonText: i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.dataSourcesFlyout.dataSourceCard.delete.confirmButtonText',
        { defaultMessage: 'Delete' }
      ),
    }
  );

  return (
    <EuiCheckableCard
      id={`dataSourceCard-${dataSourceRef.id}`}
      label={
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="m">
            <EuiTitle size="xs">
              <h3>{title ?? dataSource.type}</h3>
            </EuiTitle>
            <EuiFlexItem grow={false}>
              <EuiBadge color="success" isDisabled={!isEnabled}>
                {isEnabled
                  ? i18n.translate(
                      'xpack.streams.streamDetailView.managementTab.enrichment.dataSourcesFlyout.dataSourceCard.enabled',
                      { defaultMessage: 'Enabled' }
                    )
                  : i18n.translate(
                      'xpack.streams.streamDetailView.managementTab.enrichment.dataSourcesFlyout.dataSourceCard.disabled',
                      { defaultMessage: 'Disabled' }
                    )}
              </EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem grow />
            {canDeleteDataSource && (
              <EuiButtonIcon
                iconType="trash"
                onClick={deleteDataSource}
                aria-label={i18n.translate(
                  'xpack.streams.streamDetailView.managementTab.enrichment.dataSourcesFlyout.dataSourceCard.deleteDataSourceLabel',
                  { defaultMessage: 'Delete data source' }
                )}
              />
            )}
          </EuiFlexGroup>
          <EuiText component="p" color="subdued" size="xs">
            {subtitle}
          </EuiText>
        </EuiFlexGroup>
      }
      checkableType="checkbox"
      onChange={toggleActivity}
      checked={isEnabled}
    >
      {children}
      <EuiAccordion
        id={dataSourceRef.id}
        buttonContent={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.dataSourcesFlyout.dataSourceCard.dataPreviewAccordion.label',
          { defaultMessage: 'Data preview' }
        )}
      >
        <EuiSpacer size="s" />
        {isLoading && <EuiProgress size="xs" color="accent" position="absolute" />}
        {isEmpty(previewDocs) ? (
          <EuiEmptyPrompt
            icon={<AssetImage type="noResults" size="s" />}
            titleSize="xs"
            title={
              <h4>
                {i18n.translate(
                  'xpack.streams.streamDetailView.managementTab.enrichment.dataSourcesFlyout.dataSourceCard.dataPreviewAccordion.noData',
                  { defaultMessage: 'No documents to preview available' }
                )}
              </h4>
            }
          />
        ) : (
          <PreviewTable documents={previewDocs} height={150} />
        )}
      </EuiAccordion>
    </EuiCheckableCard>
  );
};
