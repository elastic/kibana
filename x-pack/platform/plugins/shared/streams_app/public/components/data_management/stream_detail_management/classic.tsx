/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { Streams } from '@kbn/streams-schema';
import { EuiBadgeGroup, EuiCallOut, EuiFlexGroup, EuiToolTip } from '@elastic/eui';
import { useStreamsAppParams } from '../../../hooks/use_streams_app_params';
import { useStreamsPrivileges } from '../../../hooks/use_streams_privileges';
import { RedirectTo } from '../../redirect_to';
import type { ManagementTabs } from './wrapper';
import { Wrapper } from './wrapper';
import { StreamDetailLifecycle } from '../stream_detail_lifecycle';
import { StreamsAppPageTemplate } from '../../streams_app_page_template';
import { ClassicStreamBadge, LifecycleBadge } from '../../stream_badges';
import { useStreamsDetailManagementTabs } from './use_streams_detail_management_tabs';
import { StreamDetailDataQuality } from '../../stream_data_quality';
import { StreamDetailSchemaEditor } from '../stream_detail_schema_editor';
import { StreamDetailAttachments } from '../../stream_detail_attachments';
import { ClassicAdvancedView } from './advanced_view/classic_advanced_view';

const classicStreamManagementSubTabs = [
  'processing',
  'advanced',
  'dataQuality',
  'retention',
  'significantEvents',
  'schemaEditor',
  'schema',
  'attachments',
] as const;

type ClassicStreamManagementSubTab = (typeof classicStreamManagementSubTabs)[number];

const tabRedirects: Record<string, { newTab: ClassicStreamManagementSubTab }> = {
  schemaEditor: { newTab: 'schema' },
  lifecycle: { newTab: 'retention' },
  enrich: { newTab: 'processing' },
};

function isValidManagementSubTab(value: string): value is ClassicStreamManagementSubTab {
  return classicStreamManagementSubTabs.includes(value as ClassicStreamManagementSubTab);
}

export function ClassicStreamDetailManagement({
  definition,
  refreshDefinition,
}: {
  definition: Streams.ClassicStream.GetResponse;
  refreshDefinition: () => void;
}) {
  const {
    path: { key, tab },
  } = useStreamsAppParams('/{key}/management/{tab}');

  const {
    features: { attachments },
  } = useStreamsPrivileges();

  const { processing, isLoading, ...otherTabs } = useStreamsDetailManagementTabs({
    definition,
    refreshDefinition,
  });

  if (!definition.data_stream_exists) {
    return (
      <>
        <StreamsAppPageTemplate.Header
          bottomBorder="extended"
          pageTitle={
            <EuiFlexGroup gutterSize="s" alignItems="center">
              {key}
              <EuiBadgeGroup gutterSize="s">
                <ClassicStreamBadge />
                <LifecycleBadge lifecycle={definition.effective_lifecycle} />
              </EuiBadgeGroup>
            </EuiFlexGroup>
          }
        />
        <StreamsAppPageTemplate.Body>
          <EuiCallOut
            announceOnMount
            title={i18n.translate('xpack.streams.unmanagedStreamOverview.missingDatastream.title', {
              defaultMessage: 'Data stream missing',
            })}
            color="danger"
            iconType="error"
          >
            <p>
              {i18n.translate(
                'xpack.streams.unmanagedStreamOverview.missingDatastream.description',
                {
                  defaultMessage:
                    'The underlying Elasticsearch data stream for this classic stream is missing or not accessible because the view_index_metadata privilege is missing. Make sure you have sufficient privileges and the data stream actually exists.',
                }
              )}
            </p>
          </EuiCallOut>
        </StreamsAppPageTemplate.Body>
      </>
    );
  }

  const tabs: ManagementTabs = {};

  if (definition.data_stream_exists) {
    tabs.retention = {
      content: (
        <StreamDetailLifecycle definition={definition} refreshDefinition={refreshDefinition} />
      ),
      label: (
        <EuiToolTip
          content={i18n.translate('xpack.streams.managementTab.lifecycle.tooltip', {
            defaultMessage:
              'Control how long data stays in this stream. Set a custom duration or apply a shared policy.',
          })}
        >
          <span data-test-subj="retentionTab" tabIndex={0}>
            {i18n.translate('xpack.streams.streamDetailView.lifecycleTab', {
              defaultMessage: 'Retention',
            })}
          </span>
        </EuiToolTip>
      ),
    };
    if (processing) {
      tabs.processing = processing;
    }
  }

  tabs.schema = {
    content: (
      <StreamDetailSchemaEditor definition={definition} refreshDefinition={refreshDefinition} />
    ),
    label: i18n.translate('xpack.streams.streamDetailView.schemaEditorTab', {
      defaultMessage: 'Schema',
    }),
  };

  tabs.dataQuality = {
    content: (
      <StreamDetailDataQuality definition={definition} refreshDefinition={refreshDefinition} />
    ),
    label: (
      <EuiToolTip
        content={i18n.translate('xpack.streams.managementTab.dataQuality.tooltip', {
          defaultMessage: 'View details about this classic stream’s data quality',
        })}
      >
        <span data-test-subj="dataQualityTab" tabIndex={0}>
          {i18n.translate('xpack.streams.streamDetailView.qualityTab', {
            defaultMessage: 'Data quality',
          })}
        </span>
      </EuiToolTip>
    ),
  };

  if (attachments.enabled) {
    tabs.attachments = {
      content: <StreamDetailAttachments definition={definition} />,
      label: i18n.translate('xpack.streams.streamDetailView.attachmentsTab', {
        defaultMessage: 'Attachments',
      }),
    };
  }

  if (otherTabs.significantEvents) {
    tabs.significantEvents = otherTabs.significantEvents;
  }

  if (definition.privileges.manage) {
    tabs.advanced = {
      content: (
        <ClassicAdvancedView definition={definition} refreshDefinition={refreshDefinition} />
      ),
      label: (
        <EuiToolTip
          content={i18n.translate('xpack.streams.managementTab.advanced.tooltip', {
            defaultMessage:
              'View technical details about this classic stream’s underlying index setup',
          })}
        >
          <span tabIndex={0}>
            {i18n.translate('xpack.streams.streamDetailView.advancedTab', {
              defaultMessage: 'Advanced',
            })}
          </span>
        </EuiToolTip>
      ),
    };
  }

  if (isValidManagementSubTab(tab)) {
    return <Wrapper tabs={tabs} streamId={key} tab={tab} />;
  }

  const redirectConfig = tabRedirects[tab];
  if (redirectConfig) {
    return (
      <RedirectTo
        path="/{key}/management/{tab}"
        params={{ path: { key, tab: redirectConfig.newTab } }}
      />
    );
  }
  if (isLoading) {
    return null;
  }

  return <Wrapper tabs={tabs} streamId={key} tab={tab} />;
}
