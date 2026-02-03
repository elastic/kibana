/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiCard,
  EuiSpacer,
  EuiBadge,
  useEuiTheme,
  EuiLoadingSpinner,
  EuiEmptyPrompt,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { RuleTypeModalProps } from './rule_type_modal';

interface TemplateListProps {
  templates: RuleTypeModalProps['templates'];
  onSelectTemplate: (templateId: string) => void;
  hasMore: boolean;
  onLoadMore: () => void;
  loadingMore: boolean;
}

interface TemplateCardProps {
  template: RuleTypeModalProps['templates'][number];
  onSelectTemplate: (templateId: string) => void;
}

const TemplateCard: React.FC<TemplateCardProps> = React.memo(({ template, onSelectTemplate }) => {
  const handleClick = useCallback(() => {
    onSelectTemplate(template.id);
  }, [onSelectTemplate, template.id]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelectTemplate(template.id);
      }
    },
    [onSelectTemplate, template.id]
  );

  return (
    <EuiCard
      titleSize="xs"
      textAlign="left"
      hasBorder
      title={template.name}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      description=""
      style={{ marginRight: '8px', flexGrow: 0 }}
      data-test-subj={`${template.id}-SelectOption`}
    >
      <EuiFlexGroup gutterSize="s" alignItems="center" wrap responsive={false}>
        {!!template.tags?.length && (
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
              {template.tags.map((t) => (
                <EuiFlexItem key={t} grow={false}>
                  <EuiBadge color="hollow">{t}</EuiBadge>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiCard>
  );
});

TemplateCard.displayName = 'TemplateCard';

export const TemplateList: React.FC<TemplateListProps> = ({
  templates,
  onSelectTemplate,
  hasMore,
  onLoadMore,
  loadingMore,
}) => {
  const { euiTheme } = useEuiTheme();
  const observerRef = useRef<IntersectionObserver>();

  const fetchNext = useCallback(
    ([entry]: IntersectionObserverEntry[]) => {
      if (entry.isIntersecting && hasMore && !loadingMore) {
        onLoadMore();
      }
    },
    [hasMore, loadingMore, onLoadMore]
  );

  useEffect(() => {
    return () => observerRef.current?.disconnect();
  }, []);

  // Attaches an intersection observer to the last element
  // to trigger a callback to paginate when the user scrolls to it
  const setPaginationObserver = useCallback(
    (ref: HTMLDivElement | null) => {
      observerRef.current?.disconnect();

      if (!ref) {
        return;
      }

      observerRef.current = new IntersectionObserver(fetchNext, {
        root: null,
        threshold: 0.1,
      });
      observerRef.current.observe(ref);
    },
    [fetchNext]
  );

  return (
    <EuiFlexGroup
      style={{
        height: '100%',
      }}
    >
      <EuiFlexItem
        style={{
          overflowY: 'auto',
          padding: `${euiTheme.size.base} ${euiTheme.size.base} ${euiTheme.size.xl}`,
        }}
      >
        {templates.length === 0 && (
          <EuiEmptyPrompt
            color="subdued"
            iconType="search"
            title={
              <h2>
                {i18n.translate(
                  'responseOpsRuleForm.components.ruleTypeModal.noTemplatesErrorTitle',
                  {
                    defaultMessage: 'No templates found',
                  }
                )}
              </h2>
            }
            body={
              <p>
                {i18n.translate(
                  'responseOpsRuleForm.components.ruleTypeModal.noTemplatesErrorBody',
                  {
                    defaultMessage: 'Try a different search or change your filter settings',
                  }
                )}
              </p>
            }
          />
        )}
        {templates.map((tpl) => (
          <React.Fragment key={tpl.id}>
            <TemplateCard template={tpl} onSelectTemplate={onSelectTemplate} />
            <EuiSpacer size="s" />
          </React.Fragment>
        ))}

        {/* Observer element for infinite scrolling */}
        {hasMore && (
          <div
            ref={setPaginationObserver}
            style={{ height: '1px' }}
            data-test-subj="templateList-loadMoreTrigger"
          />
        )}

        {loadingMore && (
          <EuiFlexGroup justifyContent="center">
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="m" />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
