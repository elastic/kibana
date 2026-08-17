/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { AppHeader } from '@kbn/app-header';
import {
  ContentList,
  ContentListFooter,
  ContentListProvider,
  ContentListTable,
  ContentListToolbar,
} from '@kbn/content-list';
import type { ContentListItem } from '@kbn/content-list';
import { useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { experimentalBadge } from '../../components/experimental_badge';
import { RULE_TEMPLATES_CONTENT_LIST_ID } from '../../constants';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { useInstallRuleTemplate } from '../../hooks/use_install_rule_template';
import { useComposeDiscoverFlyout } from '../../hooks/use_compose_discover_flyout';
import { UserCapabilities } from '../../services/user_capabilities';
import { RuleLibraryActionsCell } from './rule_library_actions_cell';
import {
  useRuleTemplatesDataSource,
  type RuleTemplateContentListItem,
} from './rule_templates_data_source';

const { Column } = ContentListTable;

const RULE_LIBRARY_PAGE_TITLE = i18n.translate('xpack.alertingV2.ruleLibrary.pageTitle', {
  defaultMessage: 'Rule library',
});

const toTemplate = (item: ContentListItem) => (item as RuleTemplateContentListItem).template;

export const RuleLibraryPage = () => {
  useBreadcrumbs('rule_library_list');

  const canWrite = useService(UserCapabilities).canWrite('rules');
  const dataSource = useRuleTemplatesDataSource();
  const {
    mutate: installTemplate,
    isLoading: isInstalling,
    variables: installingTemplate,
  } = useInstallRuleTemplate();
  const { flyout, openCreateFromTemplate } = useComposeDiscoverFlyout();

  const emptyState = (
    <EuiEmptyPrompt
      data-test-subj="ruleLibraryEmptyPrompt"
      iconType="indexOpen"
      title={
        <h2>
          <FormattedMessage
            id="xpack.alertingV2.ruleLibrary.emptyTitle"
            defaultMessage="No rule templates"
          />
        </h2>
      }
      body={
        <p>
          <FormattedMessage
            id="xpack.alertingV2.ruleLibrary.emptyBody"
            defaultMessage="Rule templates are provided by Fleet integrations. Update or install integrations to view available rule templates."
          />
        </p>
      }
    />
  );

  return (
    <div data-test-subj="ruleLibraryPage">
      <ContentListProvider
        id={RULE_TEMPLATES_CONTENT_LIST_ID}
        queryKeyScope={RULE_TEMPLATES_CONTENT_LIST_ID}
        labels={{
          entity: i18n.translate('xpack.alertingV2.ruleLibrary.entity', {
            defaultMessage: 'rule template',
          }),
          entityPlural: i18n.translate('xpack.alertingV2.ruleLibrary.entityPlural', {
            defaultMessage: 'rule templates',
          }),
          searchPlaceholder: i18n.translate('xpack.alertingV2.ruleLibrary.searchPlaceholder', {
            defaultMessage: 'Search rule templates',
          }),
        }}
        dataSource={dataSource}
        features={{
          sorting: {
            initialSort: { field: 'name', direction: 'asc' },
            fields: [
              {
                field: 'name',
                name: i18n.translate('xpack.alertingV2.ruleLibrary.sort.name', {
                  defaultMessage: 'Name',
                }),
              },
              {
                field: 'tags',
                name: i18n.translate('xpack.alertingV2.ruleLibrary.sort.tags', {
                  defaultMessage: 'Tags',
                }),
              },
            ],
          },
          pagination: { initialPageSize: 20 },
          search: true,
          selection: false,
        }}
      >
        <AppHeader
          sticky={false}
          title={RULE_LIBRARY_PAGE_TITLE}
          badges={[experimentalBadge]}
          spacing="bleed"
        />
        <EuiSpacer size="m" />
        <ContentList emptyState={emptyState} data-test-subj="ruleLibraryList">
          <ContentListToolbar />
          <ContentListTable
            title={RULE_LIBRARY_PAGE_TITLE}
            scrollableInline
            responsiveBreakpoint={false}
          >
            <Column.Name showDescription width="40em" />
            <Column
              id="tags"
              name={i18n.translate('xpack.alertingV2.ruleLibrary.column.tags', {
                defaultMessage: 'Tags',
              })}
              width="16em"
              render={(item: ContentListItem) => {
                const tags = toTemplate(item).rule.metadata.tags;
                if (!tags?.length) return null;
                return (
                  <EuiFlexGroup gutterSize="xs" wrap>
                    {tags.map((tag) => (
                      <EuiFlexItem grow={false} key={tag}>
                        <EuiBadge color="hollow">{tag}</EuiBadge>
                      </EuiFlexItem>
                    ))}
                  </EuiFlexGroup>
                );
              }}
            />
            <Column
              id="actions"
              name={i18n.translate('xpack.alertingV2.ruleLibrary.column.actions', {
                defaultMessage: 'Actions',
              })}
              width="10em"
              render={(item: ContentListItem) => (
                <RuleLibraryActionsCell
                  canWrite={canWrite}
                  isInstalling={isInstalling && installingTemplate?.id === item.id}
                  onInstall={() => installTemplate(toTemplate(item))}
                  onReviewAndCreate={() => openCreateFromTemplate(toTemplate(item))}
                />
              )}
            />
          </ContentListTable>
          <ContentListFooter />
        </ContentList>
      </ContentListProvider>
      {flyout}
    </div>
  );
};
