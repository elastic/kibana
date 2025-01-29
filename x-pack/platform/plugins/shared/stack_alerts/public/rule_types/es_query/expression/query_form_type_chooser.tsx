/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiListGroup,
  EuiListGroupItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { SearchType } from '../types';
import { useTriggerUiActionServices } from '../util';

export interface QueryFormTypeProps {
  searchType: SearchType | null;
  onFormTypeSelect: (formType: SearchType | null) => void;
}

export const QueryFormTypeChooser: React.FC<QueryFormTypeProps> = ({
  searchType,
  onFormTypeSelect,
}) => {
  const { uiSettings } = useTriggerUiActionServices();
  const isEsqlEnabled = uiSettings?.get('enableESQL');

  const formTypeItems = useMemo(() => {
    const items: Array<{ formType: SearchType; label: string; description: string }> = [
      {
        formType: SearchType.searchSource,
        label: i18n.translate(
          'xpack.stackAlerts.esQuery.ui.selectQueryFormType.kqlOrLuceneFormTypeLabel',
          {
            defaultMessage: 'KQL or Lucene',
          }
        ),
        description: i18n.translate(
          'xpack.stackAlerts.esQuery.ui.selectQueryFormType.kqlOrLuceneFormTypeDescription',
          {
            defaultMessage: 'Use KQL or Lucene to define a text-based query.',
          }
        ),
      },
      {
        formType: SearchType.esQuery,
        label: i18n.translate(
          'xpack.stackAlerts.esQuery.ui.selectQueryFormType.queryDslFormTypeLabel',
          {
            defaultMessage: 'Query DSL',
          }
        ),
        description: i18n.translate(
          'xpack.stackAlerts.esQuery.ui.selectQueryFormType.queryDslFormTypeDescription',
          {
            defaultMessage: 'Use the Elasticsearch Query DSL to define a query.',
          }
        ),
      },
    ];

    if (isEsqlEnabled) {
      items.push({
        formType: SearchType.esqlQuery,
        label: i18n.translate(
          'xpack.stackAlerts.esQuery.ui.selectQueryFormType.esqlFormTypeLabel',
          {
            defaultMessage: 'ES|QL',
          }
        ),
        description: i18n.translate(
          'xpack.stackAlerts.esQuery.ui.selectQueryFormType.esqlFormTypeDescription',
          {
            defaultMessage: 'Use ES|QL to define a text-based query.',
          }
        ),
      });
    }
    return items;
  }, [isEsqlEnabled]);

  if (searchType) {
    const activeFormTypeItem = formTypeItems.find((item) => item.formType === searchType);

    return (
      <>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem>
            <EuiFlexGroup alignItems="center" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiTitle size="xs" data-test-subj="selectedRuleFormTypeTitle">
                  <h5>{activeFormTypeItem?.label}</h5>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="cross"
              color="danger"
              data-test-subj="queryFormTypeChooserCancel"
              aria-label={i18n.translate(
                'xpack.stackAlerts.esQuery.ui.selectQueryFormType.cancelSelectionAriaLabel',
                {
                  defaultMessage: 'Cancel selection',
                }
              )}
              onClick={() => onFormTypeSelect(null)}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiText color="subdued" size="s" data-test-subj="selectedRuleFormTypeDescription">
          {activeFormTypeItem?.description}
        </EuiText>
        <EuiSpacer />
      </>
    );
  }

  return (
    <>
      <EuiTitle size="xs">
        <h5 data-test-subj="queryFormTypeChooserTitle">
          <FormattedMessage
            id="xpack.stackAlerts.esQuery.ui.selectQueryFormTypeLabel"
            defaultMessage="Select a query type"
          />
        </h5>
      </EuiTitle>
      <EuiListGroup flush gutterSize="m" size="m" maxWidth={false}>
        {formTypeItems.map((item) => (
          <EuiListGroupItem
            wrapText
            key={`form-type-${item.formType}`}
            data-test-subj={`queryFormType_${item.formType}`}
            color="primary"
            label={
              <span>
                <EuiFlexGroup alignItems="center" gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <strong>{item.label}</strong>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiText color="subdued" size="s">
                  <p>{item.description}</p>
                </EuiText>
              </span>
            }
            onClick={() => onFormTypeSelect(item.formType)}
          />
        ))}
      </EuiListGroup>
      <EuiSpacer />
    </>
  );
};
