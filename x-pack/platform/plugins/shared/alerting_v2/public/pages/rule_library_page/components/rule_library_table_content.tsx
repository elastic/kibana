/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { Query } from '@elastic/eui';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiLink, EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  ContentListFooter,
  ContentListTable,
  ContentListToolbar,
  SelectableFilterPopover,
  StandardFilterOption,
} from '@kbn/content-list';
import type { ContentListItem } from '@kbn/content-list';
import { TAG_FILTER_ID } from '@kbn/content-list-provider';
import { filter } from '@kbn/content-list-toolbar';
import type { CreateRuleData } from '@kbn/alerting-v2-schemas';
import { createRuleDataFromTemplate } from '../../../../common/create_rule_data_from_template';
import { useFetchRuleTemplateTags } from '../../../hooks/use_fetch_rule_template_tags';
import type { RuleTemplateContentListItem } from '../rule_templates_data_source';

const { Column } = ContentListTable;

const TAGS_FILTER_TITLE = i18n.translate('xpack.alertingV2.ruleLibrary.filter.tags.title', {
  defaultMessage: 'Tags',
});

const RULE_LIBRARY_PAGE_TITLE = i18n.translate('xpack.alertingV2.ruleLibrary.pageTitle', {
  defaultMessage: 'Rule library',
});

const CREATE_ACTION_LABEL = i18n.translate('xpack.alertingV2.ruleLibrary.column.create', {
  defaultMessage: 'Create',
});

const INSTALL_ACTION_LABEL = i18n.translate('xpack.alertingV2.ruleLibrary.column.install', {
  defaultMessage: 'Install',
});

interface RuleLibraryTableContentProps {
  onCreateFromTemplate: (templateId: string, createData: CreateRuleData) => void;
  oneClickInstall: boolean;
  installingTemplateId: string | null;
}

export const RuleLibraryTableContent = ({
  onCreateFromTemplate,
  oneClickInstall,
  installingTemplateId,
}: RuleLibraryTableContentProps) => {
  const isInstallInProgress = installingTemplateId != null;

  const handleCreate = useCallback(
    (item: ContentListItem) => {
      const { id, ...templateData } = toTemplate(item);
      onCreateFromTemplate(id, createRuleDataFromTemplate(templateData));
    },
    [onCreateFromTemplate]
  );

  const actionLabel = oneClickInstall ? INSTALL_ACTION_LABEL : CREATE_ACTION_LABEL;

  return (
    <>
      <ContentListToolbar>
        <ContentListToolbar.Filters>
          <TagsFilter />
        </ContentListToolbar.Filters>
      </ContentListToolbar>
      <ContentListTable
        title={RULE_LIBRARY_PAGE_TITLE}
        scrollableInline
        responsiveBreakpoint={false}
      >
        <Column.Name showDescription />
        <Column
          id="tags"
          name={i18n.translate('xpack.alertingV2.ruleLibrary.column.tags', {
            defaultMessage: 'Tags',
          })}
          width="160px"
          render={(item) => {
            const { metadata } = toTemplate(item);
            const tags = metadata.tags ?? [];
            if (!tags.length) return null;
            return (
              <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiBadge iconType="tag" color="hollow">
                    {tags.length}
                  </EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
            );
          }}
        />
        <Column
          id="schedule"
          name={i18n.translate('xpack.alertingV2.ruleLibrary.column.schedule', {
            defaultMessage: 'Schedule',
          })}
          width="120px"
          render={(item) => toTemplate(item).schedule.every}
        />
        <Column
          id="actions"
          name={i18n.translate('xpack.alertingV2.ruleLibrary.column.actions', {
            defaultMessage: 'Actions',
          })}
          width="100px"
          render={(item) => {
            const templateId = toTemplate(item).id;
            if (installingTemplateId === templateId) {
              return (
                <EuiLoadingSpinner size="m" data-test-subj="ruleLibraryInstallSpinner" />
              );
            }

            return (
              <EuiLink
                disabled={isInstallInProgress}
                onClick={(event: React.MouseEvent) => {
                  event.preventDefault();
                  if (isInstallInProgress) {
                    return;
                  }
                  handleCreate(item);
                }}
                data-test-subj="ruleLibraryCreateAction"
              >
                {actionLabel}
              </EuiLink>
            );
          }}
        />
      </ContentListTable>
      <ContentListFooter />
    </>
  );
};

const toTemplate = (item: ContentListItem) => (item as RuleTemplateContentListItem).template;

const TagsFilterComponent = ({
  query,
  onChange,
}: {
  query?: Query;
  onChange?: (query: Query) => void;
}) => {
  const { data: tagNames = [] } = useFetchRuleTemplateTags();
  const options = useMemo(() => tagNames.map((tag) => ({ key: tag, label: tag })), [tagNames]);
  return (
    <SelectableFilterPopover
      fieldName={TAG_FILTER_ID}
      title={TAGS_FILTER_TITLE}
      query={query}
      onChange={onChange}
      options={options}
      renderOption={(option, { isActive }) => (
        <StandardFilterOption isActive={isActive}>{option.label}</StandardFilterOption>
      )}
      data-test-subj="ruleLibraryTagsFilter"
    />
  );
};

const TagsFilter = filter.createComponent({
  resolve: () => ({
    type: 'custom_component' as const,
    component: TagsFilterComponent,
  }),
});
