/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useCallback } from 'react';
import {
  EuiPageHeader,
  EuiModal,
  EuiPanel,
  EuiPageHeaderSection,
  EuiTitle,
  EuiFieldSearch,
  EuiSpacer,
  useEuiTheme,
  useCurrentEuiBreakpoint,
  EuiEmptyPrompt,
  EuiLoadingSpinner,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonGroup,
} from '@elastic/eui';
import { RuleTypeList } from './rule_type_list';
import { TemplateList } from './template_list';
import type { RuleTypeWithDescription, RuleTypeCountsByProducer } from '../types';

export interface RuleTypeModalProps {
  onClose: () => void;
  onSelectRuleType: (ruleTypeId: string) => void;
  onSelectTemplate: (templateId: string) => void;
  onFilterByProducer: (producer: string | null) => void;
  onChangeSearch: (search: string) => void;
  onChangeMode: (mode: 'ruleType' | 'template') => void;
  searchString: string;
  selectedProducer: string | null;
  selectedMode: 'ruleType' | 'template';
  showCategories: boolean;
  templates: Array<{
    id: string;
    name: string;
    tags: string[];
    ruleTypeId: string;
    ruleTypeName?: string;
    producer?: string;
  }>;
  templatesLoading: boolean;
  templatesLoadingMore: boolean;
  hasMoreTemplates: boolean;
  onLoadMoreTemplates: () => void;
}

export interface RuleTypeModalState {
  ruleTypes: RuleTypeWithDescription[];
  ruleTypesLoading: boolean;
  ruleTypeCountsByProducer: RuleTypeCountsByProducer;
}

const loadingPrompt = (
  <EuiEmptyPrompt
    title={
      <h2>
        {i18n.translate('responseOpsRuleForm.components.ruleTypeModal.loadingRuleTypes', {
          defaultMessage: 'Loading rule types',
        })}
      </h2>
    }
    icon={<EuiLoadingSpinner size="xl" />}
  />
);

const loadingTemplatesPrompt = (
  <EuiEmptyPrompt
    title={
      <h2>
        {i18n.translate('responseOpsRuleForm.components.ruleTypeModal.loadingTemplates', {
          defaultMessage: 'Loading templates',
        })}
      </h2>
    }
    icon={<EuiLoadingSpinner size="xl" />}
  />
);

const ruleTypeModalTitle = i18n.translate('responseOpsRuleForm.components.ruleTypeModal.title', {
  defaultMessage: 'Create new rule',
});

export const RuleTypeModal: React.FC<RuleTypeModalProps & RuleTypeModalState> = ({
  onClose,
  onSelectRuleType,
  onSelectTemplate,
  onFilterByProducer,
  onChangeSearch,
  onChangeMode,
  ruleTypes,
  ruleTypesLoading,
  ruleTypeCountsByProducer,
  searchString,
  selectedProducer,
  selectedMode,
  showCategories,
  templates,
  templatesLoading,
  templatesLoadingMore,
  hasMoreTemplates,
  onLoadMoreTemplates,
}) => {
  const { euiTheme } = useEuiTheme();
  const currentBreakpoint = useCurrentEuiBreakpoint() ?? 'm';
  const isFullscreenPortrait = ['s', 'xs'].includes(currentBreakpoint);

  const modeOptions = [
    {
      id: 'ruleType',
      label: i18n.translate('responseOpsRuleForm.components.ruleTypeModal.ruleTypeOption', {
        defaultMessage: 'Rule type',
      }),
    },
    {
      id: 'template',
      label: i18n.translate('responseOpsRuleForm.components.ruleTypeModal.templateOption', {
        defaultMessage: 'Template',
      }),
    },
  ];

  const searchPlaceholder =
    selectedMode === 'ruleType'
      ? i18n.translate('responseOpsRuleForm.components.ruleTypeModal.searchRuleTypesPlaceholder', {
          defaultMessage: 'Search rule types...',
        })
      : i18n.translate('responseOpsRuleForm.components.ruleTypeModal.searchTemplatesPlaceholder', {
          defaultMessage: 'Search templates...',
        });

  const onClearFilters = useCallback(() => {
    onFilterByProducer(null);
    onChangeSearch('');
  }, [onFilterByProducer, onChangeSearch]);

  return (
    <EuiModal
      onClose={onClose}
      maxWidth={euiTheme.breakpoint[currentBreakpoint]}
      style={{
        width: euiTheme.breakpoint[currentBreakpoint],
        maxHeight: isFullscreenPortrait ? 'initial' : '960px',
        height: isFullscreenPortrait ? 'initial' : '80vh',
        overflow: isFullscreenPortrait ? 'auto' : 'hidden',
      }}
      data-test-subj="ruleTypeModal"
      aria-label={ruleTypeModalTitle}
    >
      <EuiPanel paddingSize="m" style={!isFullscreenPortrait ? { maxHeight: '100%' } : {}}>
        <EuiFlexGroup direction="column" style={{ height: '100%' }}>
          <EuiFlexItem grow={0}>
            <EuiPageHeader bottomBorder="extended" paddingSize="m">
              <EuiPageHeaderSection style={{ width: '100%' }}>
                <EuiTitle size="s">
                  <h1>{ruleTypeModalTitle}</h1>
                </EuiTitle>
                <EuiSpacer size="m" />
                <EuiFlexGroup alignItems="center">
                  <EuiFlexItem
                    grow={1}
                    style={{
                      paddingRight: euiTheme.size.base, // match the column layout for rule type categories
                    }}
                  >
                    <EuiButtonGroup
                      legend={i18n.translate(
                        'responseOpsRuleForm.components.ruleTypeModal.modeSelectionLegend',
                        {
                          defaultMessage: 'Select creation mode',
                        }
                      )}
                      options={modeOptions}
                      idSelected={selectedMode}
                      onChange={(id) => onChangeMode(id as 'ruleType' | 'template')}
                      buttonSize="compressed"
                      isFullWidth={true}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem
                    grow={3}
                    style={{
                      marginRight: '8px', // the header is already padded on the right which matches the rule type list container, but we need to add the 8px margin from the card itself.
                    }}
                  >
                    <EuiFieldSearch
                      id="ruleTypeModalSearch"
                      data-test-subj="ruleTypeModalSearch"
                      placeholder={searchPlaceholder}
                      value={searchString}
                      onChange={({ target: { value } }) => onChangeSearch(value)}
                      fullWidth
                      compressed
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPageHeaderSection>
            </EuiPageHeader>
          </EuiFlexItem>
          <EuiFlexItem
            style={{
              overflow: 'hidden',
              marginTop: `-${euiTheme.size.base}`,
            }}
          >
            {selectedMode === 'ruleType' && ruleTypesLoading ? (
              loadingPrompt
            ) : selectedMode === 'ruleType' ? (
              <RuleTypeList
                ruleTypes={ruleTypes}
                ruleTypeCountsByProducer={ruleTypeCountsByProducer}
                onSelectRuleType={onSelectRuleType}
                onFilterByProducer={onFilterByProducer}
                selectedProducer={selectedProducer}
                onClearFilters={onClearFilters}
                showCategories={showCategories}
              />
            ) : templatesLoading ? (
              loadingTemplatesPrompt
            ) : (
              <TemplateList
                templates={templates}
                onSelectTemplate={onSelectTemplate}
                hasMore={hasMoreTemplates}
                onLoadMore={onLoadMoreTemplates}
                loadingMore={templatesLoadingMore}
              />
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiModal>
  );
};
