/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { ContentList, ContentListProvider } from '@kbn/content-list';
import type { FieldDefinition } from '@kbn/content-list-provider';
import { TAG_FILTER_ID } from '@kbn/content-list-provider';
import type { CreateRuleData } from '@kbn/alerting-v2-schemas';
import { useRuleTemplatesDataSource } from '../rule_templates_data_source';
import { RuleLibraryTableContent } from './rule_library_table_content';

const tagFieldDefinition: FieldDefinition = {
  fieldName: TAG_FILTER_ID,
  resolveIdToDisplay: (id) => id,
  resolveDisplayToId: (displayValue) => displayValue,
};

const FEATURES_FIELDS: FieldDefinition[] = [tagFieldDefinition];

interface RuleLibraryTableProps {
  onCreateFromTemplate: (templateId: string, createData: CreateRuleData) => void;
  onInstallFromTemplate: (templateId: string, createData: CreateRuleData) => void;
  installingTemplateId: string | null;
}

export const RuleLibraryTable = ({
  onCreateFromTemplate,
  onInstallFromTemplate,
  installingTemplateId,
}: RuleLibraryTableProps) => {
  const dataSource = useRuleTemplatesDataSource();
  const itemConfig = useMemo(() => ({}), []);

  return (
    <ContentListProvider
      id="rule-library"
      labels={{
        entity: i18n.translate('xpack.alertingV2.ruleLibrary.entity', {
          defaultMessage: 'rule template',
        }),
        entityPlural: i18n.translate('xpack.alertingV2.ruleLibrary.entityPlural', {
          defaultMessage: 'rule templates',
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
        selection: true,
        fields: FEATURES_FIELDS,
      }}
    >
      <ContentList>
        <RuleLibraryTableContent
          onCreateFromTemplate={onCreateFromTemplate}
          onInstallFromTemplate={onInstallFromTemplate}
          installingTemplateId={installingTemplateId}
        />
      </ContentList>
    </ContentListProvider>
  );
};
