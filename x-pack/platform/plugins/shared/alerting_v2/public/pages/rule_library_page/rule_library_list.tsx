/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiBadge, EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import {
  ContentList,
  ContentListFooter,
  ContentListProvider,
  ContentListTable,
  ContentListToolbar,
} from '@kbn/content-list';
import type { ContentListItem, ContentListItemConfig } from '@kbn/content-list';
import { useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { RuleTemplateResponse } from '@kbn/alerting-v2-schemas';
import { useAlertingLocators } from '../../application/locator_context';
import { RULE_TEMPLATES_CONTENT_LIST_ID } from '../../constants';
import { UserCapabilities } from '../../services/user_capabilities';
import {
  useRuleTemplatesDataSource,
  type RuleTemplateContentListItem,
} from './rule_templates_data_source';

import { RuleTemplateTagsFilter, RULE_LIBRARY_FEATURES_FIELDS } from './rule_library_filters';

const { Column, Action } = ContentListTable;

const RULE_LIBRARY_LIST_TITLE = i18n.translate('xpack.alertingV2.ruleLibrary.pageTitle', {
  defaultMessage: 'Rule library',
});

const CREATE_ACTION_NAME = i18n.translate('xpack.alertingV2.ruleLibrary.createButtonLabel', {
  defaultMessage: 'Create',
});

const CREATE_RESTRICTED_REASON = i18n.translate(
  'xpack.alertingV2.ruleLibrary.createRestrictedTooltip',
  {
    defaultMessage: 'You do not have permission to create rules from templates',
  }
);

const toTemplate = (item: ContentListItem) => (item as RuleTemplateContentListItem).template;

export interface RuleLibraryListProps {
  onCreateFromTemplate: (template: RuleTemplateResponse) => void;
}

export const RuleLibraryList = ({ onCreateFromTemplate }: RuleLibraryListProps) => {
  const canWrite = useService(UserCapabilities).canWrite('rules');
  const { rulesLocators } = useAlertingLocators();
  const dataSource = useRuleTemplatesDataSource();

  const itemConfig = useMemo(
    (): ContentListItemConfig => ({
      actions: {
        create: {
          onItemAction: (item) => {
            onCreateFromTemplate(toTemplate(item));
          },
          restriction: canWrite ? undefined : () => CREATE_RESTRICTED_REASON,
        },
      },
    }),
    [canWrite, onCreateFromTemplate]
  );

  const renderRuleCount = (item: ContentListItem) => {
    const { id: templateId, rule_count: ruleCount } = toTemplate(item);
    if (ruleCount === undefined) return null;
    if (ruleCount === 0) return ruleCount;

    return (
      <EuiLink
        href={rulesLocators.getRedirectUrl({ derivedFromTemplateId: templateId })}
        target="_blank"
        rel="noopener noreferrer"
        data-test-subj="ruleLibraryRuleCountLink"
      >
        {ruleCount}
      </EuiLink>
    );
  };

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
        fields: RULE_LIBRARY_FEATURES_FIELDS,
      }}
    >
      <ContentList emptyState={emptyState} data-test-subj="ruleLibraryList">
        <ContentListToolbar>
          <ContentListToolbar.Filters>
            <RuleTemplateTagsFilter />
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
            id="ruleCount"
            name={i18n.translate('xpack.alertingV2.ruleLibrary.column.ruleCount', {
              defaultMessage: 'Rules',
            })}
            width="6em"
            render={renderRuleCount}
          />
          <Column.Actions width="14em" sticky={false}>
            <Action
              id="create"
              name={CREATE_ACTION_NAME}
              description={CREATE_ACTION_NAME}
              type="button"
              enabled={(item: ContentListItem) => canWrite}
              data-test-subj="ruleLibraryCreateAction"
            />
          </Column.Actions>
        </ContentListTable>
        <ContentListFooter />
      </ContentList>
    </ContentListProvider>
  );
};
