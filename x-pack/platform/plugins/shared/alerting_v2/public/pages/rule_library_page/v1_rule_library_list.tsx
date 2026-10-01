/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiBadge, EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import {
  ContentList,
  ContentListFooter,
  ContentListProvider,
  ContentListTable,
  ContentListToolbar,
} from '@kbn/content-list';
import type { ContentListItem, ContentListItemConfig } from '@kbn/content-list';
import { useService, CoreStart } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  getCreateRuleFromTemplateRoute,
  getTriggersActionsManagementPath,
} from '@kbn/rule-data-utils';
import { MANAGEMENT_APP_ID, V1_RULE_TEMPLATES_CONTENT_LIST_ID } from '../../constants';
import { RULE_LIBRARY_FEATURES_FIELDS, V1RuleTemplateTagsFilter } from './rule_library_filters';
import {
  useV1RuleTemplatesDataSource,
  type V1RuleTemplateContentListItem,
} from './v1_rule_templates_data_source';

const { Column, Action } = ContentListTable;

const RULE_LIBRARY_LIST_TITLE = i18n.translate('xpack.alertingV2.ruleLibrary.v1.pageTitle', {
  defaultMessage: 'Rule library',
});

const CREATE_ACTION_NAME = i18n.translate('xpack.alertingV2.ruleLibrary.createButtonLabel', {
  defaultMessage: 'Create',
});

const toTemplate = (item: ContentListItem) => (item as V1RuleTemplateContentListItem).template;

export const V1RuleLibraryList = ({ urlSync = true }: { urlSync?: boolean }) => {
  const application = useService(CoreStart('application'));
  const dataSource = useV1RuleTemplatesDataSource();

  const onCreate = useCallback(
    (templateId: string) => {
      application.navigateToApp(MANAGEMENT_APP_ID, {
        path: getTriggersActionsManagementPath(
          getCreateRuleFromTemplateRoute(encodeURIComponent(templateId))
        ),
      });
    },
    [application]
  );

  const itemConfig = useMemo(
    (): ContentListItemConfig => ({
      actions: {
        create: {
          onItemAction: (item) => {
            onCreate(item.id);
          },
        },
      },
    }),
    [onCreate]
  );

  const emptyState = (
    <EuiEmptyPrompt
      data-test-subj="v1RuleLibraryEmptyPrompt"
      iconType="indexOpen"
      title={
        <h2>
          <FormattedMessage
            id="xpack.alertingV2.ruleLibrary.v1.emptyTitle"
            defaultMessage="No rule templates"
          />
        </h2>
      }
      body={
        <p>
          <FormattedMessage
            id="xpack.alertingV2.ruleLibrary.v1.emptyBody"
            defaultMessage="Rule templates are provided by Fleet integrations. Update or install integrations to view available rule templates."
          />
        </p>
      }
    />
  );

  return (
    <ContentListProvider
      id={V1_RULE_TEMPLATES_CONTENT_LIST_ID}
      queryKeyScope={V1_RULE_TEMPLATES_CONTENT_LIST_ID}
      labels={{
        entity: i18n.translate('xpack.alertingV2.ruleLibrary.v1.entity', {
          defaultMessage: 'rule template',
        }),
        entityPlural: i18n.translate('xpack.alertingV2.ruleLibrary.v1.entityPlural', {
          defaultMessage: 'rule templates',
        }),
        searchPlaceholder: i18n.translate('xpack.alertingV2.ruleLibrary.v1.searchPlaceholder', {
          defaultMessage: 'Search rule templates',
        }),
      }}
      dataSource={dataSource}
      item={itemConfig}
      features={{
        urlSync,
        sorting: {
          initialSort: { field: 'name', direction: 'asc' },
          fields: [
            {
              field: 'name',
              name: i18n.translate('xpack.alertingV2.ruleLibrary.v1.sort.name', {
                defaultMessage: 'Name',
              }),
            },
            {
              field: 'tags',
              name: i18n.translate('xpack.alertingV2.ruleLibrary.v1.sort.tags', {
                defaultMessage: 'Tags',
              }),
            },
          ],
        },
        pagination: { initialPageSize: 20 },
        search: true,
        selection: false,
        fields: RULE_LIBRARY_FEATURES_FIELDS,
      }}
    >
      <ContentList emptyState={emptyState} data-test-subj="v1RuleLibraryList">
        <ContentListToolbar>
          <ContentListToolbar.Filters>
            <V1RuleTemplateTagsFilter />
          </ContentListToolbar.Filters>
        </ContentListToolbar>
        <ContentListTable
          title={RULE_LIBRARY_LIST_TITLE}
          scrollableInline
          responsiveBreakpoint={false}
        >
          <Column.Name showDescription width="40em" />
          <Column
            id="tags"
            name={i18n.translate('xpack.alertingV2.ruleLibrary.v1.column.tags', {
              defaultMessage: 'Tags',
            })}
            width="10em"
            maxWidth="10em"
            render={(item: ContentListItem) => {
              const tags = toTemplate(item).tags;
              if (!tags.length) return null;
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
          <Column.Actions width="14em" sticky={false}>
            <Action
              id="create"
              name={CREATE_ACTION_NAME}
              description={CREATE_ACTION_NAME}
              type="button"
              data-test-subj="ruleLibraryCreateAction"
            />
          </Column.Actions>
        </ContentListTable>
        <ContentListFooter />
      </ContentList>
    </ContentListProvider>
  );
};
