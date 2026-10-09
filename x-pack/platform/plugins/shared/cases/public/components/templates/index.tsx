/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiPanel,
  EuiDescribedFormGroup,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
} from '@elastic/eui';
import { MAX_TEMPLATES_LENGTH } from '../../../common/constants';
import type { CasesConfigurationUITemplate } from '../../../common/ui';
import * as i18n from './translations';
import { TemplatesList } from './templates_list';

interface Props {
  disabled: boolean;
  isLoading: boolean;
  templates: CasesConfigurationUITemplate[];
  onAddTemplate: () => void;
  onEditTemplate: (key: string) => void;
  onDeleteTemplate: (key: string) => void;
  /**
   * Hides the described-form-group title/description. Used when the parent
   * (e.g. redesign SettingsSection) already provides section headings.
   */
  hideTitle?: boolean;
  /**
   * Renders the list without the surrounding subdued panel, as line-separated
   * rows. Only used by the cases redesign settings page.
   */
  useLineSeparators?: boolean;
  /** Overrides the default empty-state copy. Pass `null` to hide it. */
  emptyStateMessage?: string | null;
  /** Overrides the add-button label. */
  addButtonLabel?: string;
}

const TemplatesComponent: React.FC<Props> = ({
  disabled,
  isLoading,
  templates,
  onAddTemplate,
  onEditTemplate,
  onDeleteTemplate,
  hideTitle = false,
  useLineSeparators = false,
  emptyStateMessage,
  addButtonLabel,
}) => {
  const [error, setError] = useState<boolean>(false);

  const handleAddTemplate = useCallback(() => {
    if (templates.length === MAX_TEMPLATES_LENGTH && !error) {
      setError(true);
      return;
    }

    onAddTemplate();
    setError(false);
  }, [onAddTemplate, error, templates]);

  const handleEditTemplate = useCallback(
    (key: string) => {
      setError(false);
      onEditTemplate(key);
    },
    [setError, onEditTemplate]
  );

  const handleDeleteTemplate = useCallback(
    (key: string) => {
      setError(false);
      onDeleteTemplate(key);
    },
    [setError, onDeleteTemplate]
  );

  const listAndFooter = (
    <>
      {templates.length ? (
        <TemplatesList
          templates={templates}
          onEditTemplate={handleEditTemplate}
          onDeleteTemplate={handleDeleteTemplate}
          useLineSeparators={useLineSeparators}
        />
      ) : null}
      <EuiSpacer size="s" />
      {!templates.length && emptyStateMessage !== null ? (
        <EuiFlexGroup justifyContent="center">
          <EuiFlexItem grow={false} data-test-subj="empty-templates">
            {emptyStateMessage ?? i18n.NO_TEMPLATES}
            <EuiSpacer size="m" />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : null}
      <EuiFlexGroup justifyContent="center">
        <EuiFlexItem grow={false}>
          {templates.length < MAX_TEMPLATES_LENGTH ? (
            <EuiButtonEmpty
              isLoading={isLoading}
              isDisabled={disabled || error}
              size="s"
              onClick={handleAddTemplate}
              iconType="plusCircle"
              data-test-subj="add-template"
            >
              {addButtonLabel ?? i18n.ADD_TEMPLATE}
            </EuiButtonEmpty>
          ) : (
            <EuiFlexGroup justifyContent="center">
              <EuiFlexItem grow={false}>
                <EuiText>{i18n.MAX_TEMPLATE_LIMIT(MAX_TEMPLATES_LENGTH)}</EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
          <EuiSpacer size="s" />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );

  const templatesContent = useLineSeparators ? (
    listAndFooter
  ) : (
    <EuiPanel paddingSize="s" color="subdued" hasBorder={false} hasShadow={false}>
      {listAndFooter}
    </EuiPanel>
  );

  const content = hideTitle ? (
    templatesContent
  ) : (
    <EuiDescribedFormGroup
      fullWidth
      title={
        <EuiFlexGroup alignItems="center" gutterSize="none">
          <EuiFlexItem grow={false}>
            <h2>{i18n.TEMPLATE_TITLE}</h2>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      description={<p>{i18n.TEMPLATE_DESCRIPTION}</p>}
      css={{ alignItems: 'flex-start' }}
    >
      {templatesContent}
    </EuiDescribedFormGroup>
  );

  return <div data-test-subj="templates-form-group">{content}</div>;
};

TemplatesComponent.displayName = 'Templates';

export const Templates = React.memo(TemplatesComponent);
