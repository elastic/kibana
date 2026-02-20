/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiButtonEmpty } from '@elastic/eui';
import * as i18n from '../../templates/translations';
import { LinkButton } from '../../links';

interface TemplatesTableEmptyPromptProps {
  hasFilters: boolean;
  onClearFilters: () => void;
  onCreateTemplate: () => void;
  createTemplateUrl: string;
}

const TemplatesTableEmptyPromptComponent: React.FC<TemplatesTableEmptyPromptProps> = ({
  hasFilters,
  onClearFilters,
  onCreateTemplate,
  createTemplateUrl,
}) => {
  if (hasFilters) {
    return (
      <EuiEmptyPrompt
        title={<h3>{i18n.NO_TEMPLATES_MATCH_FILTERS}</h3>}
        titleSize="xs"
        body={i18n.NO_TEMPLATES_MATCH_FILTERS_BODY}
        actions={
          <EuiButtonEmpty
            onClick={onClearFilters}
            size="s"
            iconSide="left"
            iconType="cross"
            data-test-subj="templates-table-empty-clear-filters"
          >
            {i18n.CLEAR_FILTERS}
          </EuiButtonEmpty>
        }
        data-test-subj="templates-table-empty-prompt-no-results"
      />
    );
  }

  return (
    <EuiEmptyPrompt
      title={<h3>{i18n.NO_TEMPLATES}</h3>}
      titleSize="xs"
      body={i18n.NO_TEMPLATES_BODY}
      actions={
        <LinkButton
          fill
          size="s"
          onClick={onCreateTemplate}
          href={createTemplateUrl}
          iconType="plusInCircle"
          data-test-subj="templates-table-add-template"
        >
          {i18n.CREATE_TEMPLATE}
        </LinkButton>
      }
      data-test-subj="templates-table-empty-prompt-no-templates"
    />
  );
};

TemplatesTableEmptyPromptComponent.displayName = 'TemplatesTableEmptyPromptComponent';

export const TemplatesTableEmptyPrompt = React.memo(TemplatesTableEmptyPromptComponent);
