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
import { ExperimentalBadge } from '../experimental_badge/experimental_badge';
import * as i18n from './translations';
import { TemplatesList } from './templates_list';

interface Props {
  disabled: boolean;
  isLoading: boolean;
  templates: CasesConfigurationUITemplate[];
  onAddTemplate: () => void;
  onEditTemplate: (key: string) => void;
  onDeleteTemplate: (key: string) => void;
}

const TemplatesComponent: React.FC<Props> = ({
  disabled,
  isLoading,
  templates,
  onAddTemplate,
  onEditTemplate,
  onDeleteTemplate,
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

  return (
    <EuiDescribedFormGroup
      fullWidth
      title={
        <EuiFlexGroup alignItems="center" gutterSize="none">
          <EuiFlexItem grow={false}>{i18n.TEMPLATE_TITLE}</EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ExperimentalBadge />
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      description={<p>{i18n.TEMPLATE_DESCRIPTION}</p>}
      data-test-subj="templates-form-group"
      css={{ alignItems: 'flex-start' }}
    >
      <EuiPanel paddingSize="s" color="subdued" hasBorder={false} hasShadow={false}>
        {templates.length ? (
          <>
            <TemplatesList
              templates={templates}
              onEditTemplate={handleEditTemplate}
              onDeleteTemplate={handleDeleteTemplate}
            />
          </>
        ) : null}
        <EuiSpacer size="s" />
        {!templates.length ? (
          <EuiFlexGroup justifyContent="center">
            <EuiFlexItem grow={false} data-test-subj="empty-templates">
              {i18n.NO_TEMPLATES}
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
                iconType="plusInCircle"
                data-test-subj="add-template"
              >
                {i18n.ADD_TEMPLATE}
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
      </EuiPanel>
    </EuiDescribedFormGroup>
  );
};

TemplatesComponent.displayName = 'Templates';

export const Templates = React.memo(TemplatesComponent);
