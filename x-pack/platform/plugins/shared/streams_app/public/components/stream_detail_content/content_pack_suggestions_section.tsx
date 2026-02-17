/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiBadge,
  EuiEmptyPrompt,
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { ContentPackDashboard } from '../../hooks/use_content_pack_suggestions_fetch';
import { useKibana } from '../../hooks/use_kibana';

interface ContentPackSuggestionsSectionProps {
  suggestions: ContentPackDashboard[];
  loading: boolean;
  streamName: string;
  onAttach: (dashboardId: string) => Promise<void>;
}

export function ContentPackSuggestionsSection({
  suggestions,
  loading,
  streamName,
  onAttach,
}: ContentPackSuggestionsSectionProps) {
  const {
    dependencies: {
      start: { share },
    },
  } = useKibana();
  const { euiTheme } = useEuiTheme();

  const navigateToDashboard = (dashboardId: string) => {
    const dashboardLocator = share.url.locators.get('DASHBOARD_APP_LOCATOR');
    if (dashboardLocator) {
      dashboardLocator.navigate({ dashboardId });
    }
  };

  const columns: Array<EuiBasicTableColumn<ContentPackDashboard>> = [
    {
      field: 'title',
      name: i18n.translate('xpack.streams.content.contentPackSuggestions.dashboardColumn', {
        defaultMessage: 'Dashboard',
      }),
      render: (title: string, dashboard: ContentPackDashboard) => (
        <EuiLink onClick={() => navigateToDashboard(dashboard.id)}>{title}</EuiLink>
      ),
    },
    {
      field: 'packageTitle',
      name: i18n.translate('xpack.streams.content.contentPackSuggestions.packageColumn', {
        defaultMessage: 'Content pack',
      }),
      render: (packageTitle: string, dashboard: ContentPackDashboard) => (
        <EuiText size="s">
          {packageTitle}{' '}
          <EuiBadge color="hollow">{dashboard.packageVersion}</EuiBadge>
        </EuiText>
      ),
    },
    {
      name: i18n.translate('xpack.streams.content.contentPackSuggestions.actionsColumn', {
        defaultMessage: 'Actions',
      }),
      width: '120px',
      actions: [
        {
          name: i18n.translate('xpack.streams.content.contentPackSuggestions.attachAction', {
            defaultMessage: 'Attach to stream',
          }),
          description: i18n.translate(
            'xpack.streams.content.contentPackSuggestions.attachActionDescription',
            {
              defaultMessage: 'Attach this dashboard to the stream',
            }
          ),
          type: 'icon',
          icon: 'link',
          onClick: (dashboard) => onAttach(dashboard.id),
          'data-test-subj': 'streamsAppContentPackAttachAction',
        },
        {
          name: i18n.translate('xpack.streams.content.contentPackSuggestions.viewAction', {
            defaultMessage: 'View dashboard',
          }),
          description: i18n.translate(
            'xpack.streams.content.contentPackSuggestions.viewActionDescription',
            {
              defaultMessage: 'Open this dashboard',
            }
          ),
          type: 'icon',
          icon: 'eye',
          onClick: (dashboard) => navigateToDashboard(dashboard.id),
          'data-test-subj': 'streamsAppContentPackViewAction',
        },
      ],
    },
  ];

  if (loading) {
    return (
      <EuiPanel hasBorder={false} hasShadow={false} paddingSize="none">
        <EuiEmptyPrompt icon={<EuiLoadingSpinner size="xl" />} title={<span />} />
      </EuiPanel>
    );
  }

  if (suggestions.length === 0) {
    return (
      <EuiPanel hasBorder={false} hasShadow={false} paddingSize="none">
        <EuiEmptyPrompt
          iconType="package"
          title={<h3>{NO_SUGGESTIONS_TITLE}</h3>}
          body={<p>{NO_SUGGESTIONS_DESCRIPTION}</p>}
        />
      </EuiPanel>
    );
  }

  return (
    <EuiPanel hasBorder={false} hasShadow={false} paddingSize="none">
      <EuiBasicTable
        css={css`
          & thead tr {
            background-color: ${euiTheme.colors.backgroundBaseSubdued};
          }
        `}
        tableCaption={i18n.translate(
          'xpack.streams.content.contentPackSuggestions.tableCaption',
          {
            defaultMessage: 'List of content pack dashboard suggestions',
          }
        )}
        data-test-subj="streamsAppContentPackSuggestionsTable"
        columns={columns}
        itemId="id"
        items={suggestions}
      />
    </EuiPanel>
  );
}

// i18n labels

const NO_SUGGESTIONS_TITLE = i18n.translate(
  'xpack.streams.content.contentPackSuggestions.empty.title',
  {
    defaultMessage: 'No content pack suggestions',
  }
);

const NO_SUGGESTIONS_DESCRIPTION = i18n.translate(
  'xpack.streams.content.contentPackSuggestions.empty.description',
  {
    defaultMessage:
      'Content pack dashboards are suggested when Fleet auto-installs content packages that match your data streams. No matching packages were found for this stream.',
  }
);
