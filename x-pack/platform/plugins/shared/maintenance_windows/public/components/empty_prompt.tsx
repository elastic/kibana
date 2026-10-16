/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiLink, EuiPageTemplate, EuiTitle } from '@elastic/eui';
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
    return (
      <EuiPageTemplate.EmptyPrompt
        data-test-subj="mw-empty-prompt"
        title={emptyTitle}
        body={emptyBody}
        actions={
          showCreateButton ? (
            <EuiButton data-test-subj="mw-create-button" fill onClick={onClickCreate}>
              {i18n.EMPTY_PROMPT_BUTTON}
            </EuiButton>
          ) : undefined
        }
        footer={
          <>
            <EuiTitle size="xxs">
              <span>{i18n.EMPTY_PROMPT_LEARN_MORE}</span>
            </EuiTitle>{' '}
            <EuiLink href={docLinks.alerting.maintenanceWindows} target="_blank">
              {i18n.EMPTY_PROMPT_READ_THE_DOCS}
            </EuiLink>
          </>
        }
      />
    );
  }
);
EmptyPrompt.displayName = 'EmptyPrompt';
