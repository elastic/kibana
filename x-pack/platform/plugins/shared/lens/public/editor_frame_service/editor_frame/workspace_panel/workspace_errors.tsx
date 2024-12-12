/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPagination,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import type { UserMessage } from '../../../types';
import { getLongMessage } from '../../../user_messages_utils';

interface Props {
  errors: Array<string | UserMessage>;
  title: string;
  onRender?: () => void;
}

export function WorkspaceErrors({ errors, title, onRender }: Props) {
  const [activePage, setActivePage] = useState(0);

  const activeError = errors.length ? errors[activePage] : '';

  React.useEffect(() => onRender?.(), [onRender]);

  return (
    <EuiEmptyPrompt
      actions={
        errors.length > 1 ? (
          <EuiFlexGroup
            justifyContent="spaceAround"
            data-test-subj="lnsWorkspaceErrorsPaginationControl"
          >
            <EuiFlexItem grow={false}>
              <EuiPagination
                pageCount={errors.length}
                activePage={activePage}
                onPageClick={setActivePage}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          []
        )
      }
      body={
        <div data-test-subj="workspace-error-message">
          {typeof activeError === 'string' ? (
            activeError
          ) : (
            <div>
              {activeError.shortMessage}
              {activeError.longMessage ? (
                <>
                  <EuiSpacer />
                  <EuiText size="s"> {getLongMessage(activeError)}</EuiText>
                </>
              ) : null}
            </div>
          )}
        </div>
      }
      title={<h2>{title}</h2>}
      iconColor="danger"
      iconType="warning"
      data-test-subj="lnsWorkspaceErrors"
    />
  );
}
