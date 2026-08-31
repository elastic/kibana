/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingSpinner,
} from '@elastic/eui';
import {
  ContentList,
  ContentListFooter,
  ContentListProvider,
  ContentListTable,
  ContentListToolbar,
} from '@kbn/content-list';
import type { ContentListItem, ContentListItemConfig } from '@kbn/content-list';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { paths, RULE_TEMPLATES_CONTENT_LIST_ID } from '../../constants';
import { useInstalledRuleCounts } from '../../hooks/use_installed_rule_counts';
import { useInstallRuleTemplate } from '../../hooks/use_install_rule_template';
import { UserCapabilities } from '../../services/user_capabilities';
import {
  useRuleTemplatesDataSource,
  type RuleTemplateContentListItem,
} from './rule_templates_data_source';

const { Column, Action } = ContentListTable;

const RULE_LIBRARY_LIST_TITLE = i18n.translate('xpack.alertingV2.ruleLibrary.pageTitle', {
  defaultMessage: 'Rule library',
});

const INSTALL_ACTION_NAME = i18n.translate('xpack.alertingV2.ruleLibrary.installButtonLabel', {
  defaultMessage: 'Install',
});

const INSTALL_RESTRICTED_REASON = i18n.translate(
  'xpack.alertingV2.ruleLibrary.installRestrictedTooltip',
  {
    defaultMessage: 'You do not have permission to install rule templates',
  }
);

const toTemplate = (item: ContentListItem) => (item as RuleTemplateContentListItem).template;

const InstalledCountColumn = ({ item }: { item: ContentListItem }) => {
  const { basePath } = useService(CoreStart('http'));
  const { counts } = useInstalledRuleCounts([item.id]);
  const count = counts.get(item.id) ?? 0;

  if (count === 0) {
    return <>{'\u2014'}</>;
  }

  const href = basePath.prepend(paths.ruleListFilteredByTemplate(item.id));
  return <EuiLink href={href}>{count}</EuiLink>;
};

export const RuleLibraryList = () => {
  const canWrite = useService(UserCapabilities).canWrite('rules');
  const dataSource = useRuleTemplatesDataSource();
  const {
    mutate: installTemplate,
    isLoading: isInstalling,
    variables: installingTemplate,
  } = useInstallRuleTemplate();

  const itemConfig = useMemo(
    (): ContentListItemConfig => ({
      actions: {
        install: {
          onItemAction: (item) => {
            installTemplate(toTemplate(item));
          },
          restriction: canWrite ? undefined : () => INSTALL_RESTRICTED_REASON,
        },
      },
    }),
    [canWrite, installTemplate]
  );

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
      item={itemConfig}
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
      <ContentList emptyState={emptyState} data-test-subj="ruleLibraryList">
        <ContentListToolbar />
        <ContentListTable
          title={RULE_LIBRARY_LIST_TITLE}
          scrollableInline
          responsiveBreakpoint={false}
        >
          <Column.Name showDescription width="40em" />
          <Column
            id="tags"
            name={i18n.translate('xpack.alertingV2.ruleLibrary.column.tags', {
              defaultMessage: 'Tags',
            })}
            width="10em"
            maxWidth="10em"
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
            id="installed"
            name={i18n.translate('xpack.alertingV2.ruleLibrary.column.installed', {
              defaultMessage: 'Installed',
            })}
            width="8em"
            render={(item: ContentListItem) => <InstalledCountColumn item={item} />}
          />
          <Column.Actions width="14em" sticky={false}>
            <Action
              id="install"
              name={(item: ContentListItem) =>
                isInstalling && installingTemplate?.id === item.id ? (
                  <EuiLoadingSpinner size="m" data-test-subj="ruleLibraryInstallLoading" />
                ) : (
                  INSTALL_ACTION_NAME
                )
              }
              description={INSTALL_ACTION_NAME}
              type="button"
              enabled={(item: ContentListItem) =>
                canWrite && !(isInstalling && installingTemplate?.id === item.id)
              }
              data-test-subj="ruleLibraryInstallAction"
            />
          </Column.Actions>
        </ContentListTable>
        <ContentListFooter />
      </ContentList>
    </ContentListProvider>
  );
};
