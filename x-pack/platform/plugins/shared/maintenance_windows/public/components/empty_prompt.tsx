/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiButton, EuiButtonEmpty, EuiPageTemplate } from '@elastic/eui';
import type { DocLinks } from '@kbn/doc-links';
import * as i18n from '../translations';

interface EmptyPromptProps {
  onClickCreate: () => void;
  docLinks: DocLinks;
  showCreateButton?: boolean;
}

const emptyTitle = <h2>{i18n.EMPTY_PROMPT_TITLE}</h2>;
const emptyBody = <p>{i18n.EMPTY_PROMPT_DESCRIPTION}</p>;

export const EmptyPrompt = React.memo<EmptyPromptProps>(
  ({ onClickCreate, showCreateButton = true, docLinks }) => {
    const renderActions = useMemo(() => {
      if (showCreateButton) {
        return [
          <EuiButton
            data-test-subj="mw-create-button"
            key="create-action"
            fill
            onClick={onClickCreate}
          >
            {i18n.EMPTY_PROMPT_BUTTON}
          </EuiButton>,
        ];
      }
      return null;
    }, [showCreateButton, onClickCreate]);

    const footer = useMemo(
      () => (
        <EuiButtonEmpty
          data-test-subj="mw-empty-prompt-documentation"
          target="_blank"
          href={docLinks.alerting.maintenanceWindows}
          iconType="question"
        >
          {i18n.EMPTY_PROMPT_DOCUMENTATION}
        </EuiButtonEmpty>
      ),
      [docLinks.alerting.maintenanceWindows]
    );

    return (
      <EuiPageTemplate.EmptyPrompt
        data-test-subj="mw-empty-prompt"
        title={emptyTitle}
        body={emptyBody}
        actions={renderActions}
        footer={footer}
      />
    );
  }
);
EmptyPrompt.displayName = 'EmptyPrompt';
