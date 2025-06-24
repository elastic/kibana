/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiPanel, EuiFlexGroup, EuiFlexItem, EuiText, EuiTitle } from '@elastic/eui';
import { AssistantIcon } from '@kbn/ai-assistant-icon';
import { useAuthorization } from '../../../common/hooks/use_authorization';
import { MissingPrivilegesTooltip } from '../../../common/components/authorization';
import { useNavigate, Page } from '../../../common/hooks/use_navigate';
import * as i18n from './translations';

export const AutomaticImportCard = React.memo(() => {
  const { canExecuteConnectors } = useAuthorization();
  const navigate = useNavigate();
  return (
    <EuiPanel hasBorder={true} paddingSize="l">
      <EuiFlexGroup direction="row" gutterSize="l" alignItems="center" justifyContent="center">
        <EuiFlexItem grow={false}>
          <AssistantIcon />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup
            direction="column"
            gutterSize="xs"
            alignItems="flexStart"
            justifyContent="flexStart"
          >
            <EuiFlexItem>
              <EuiFlexGroup direction="row" gutterSize="s">
                <EuiFlexItem>
                  <EuiTitle size="xs">
                    <h3>{i18n.AUTOMATIC_IMPORT_TITLE}</h3>
                  </EuiTitle>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s" color="subdued" textAlign="left">
                {i18n.AUTOMATIC_IMPORT_DESCRIPTION}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {canExecuteConnectors ? (
            <EuiButton onClick={() => navigate(Page.assistant)} data-test-subj="assistantButton">
              {i18n.AUTOMATIC_IMPORT_BUTTON}
            </EuiButton>
          ) : (
            <MissingPrivilegesTooltip canExecuteConnectors>
              <EuiButton disabled>{i18n.AUTOMATIC_IMPORT_BUTTON}</EuiButton>
            </MissingPrivilegesTooltip>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
});
AutomaticImportCard.displayName = 'AutomaticImportCard';
