/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiText,
  EuiTextColor,
} from '@elastic/eui';
import {
  UPDATE_FIELDS_WITH_ACTIONS,
  transformCreateRuleBody as rewriteCreateBodyRequest,
  transformUpdateRuleBody as rewriteUpdateBodyRequest,
} from '@kbn/response-ops-rule-form';
import { pick } from 'lodash';
import React from 'react';
import { RuleUpdates } from '../../../types';
import { BASE_ALERTING_API_PATH } from '../../constants';
import * as i18n from '../translations';

const stringify = (rule: RuleUpdates, edit: boolean): string => {
  try {
    const request = edit
      ? rewriteUpdateBodyRequest(pick(rule, UPDATE_FIELDS_WITH_ACTIONS))
      : rewriteCreateBodyRequest(rule);
    return JSON.stringify(request, null, 2);
  } catch {
    return i18n.SHOW_REQUEST_MODAL_ERROR;
  }
};

export interface ShowRequestModalProps {
  onClose: () => void;
  rule: RuleUpdates;
  ruleId?: string;
  edit?: boolean;
}

export const ShowRequestModal: React.FC<ShowRequestModalProps> = ({
  onClose,
  rule,
  edit = false,
  ruleId,
}) => {
  const formattedRequest = stringify(rule, edit);

  return (
    <EuiModal aria-labelledby="showRequestModal" onClose={onClose}>
      <EuiModalHeader>
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiModalHeaderTitle id="showRequestModal" data-test-subj="modalHeaderTitle">
              {i18n.SHOW_REQUEST_MODAL_TITLE(edit)}
            </EuiModalHeaderTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText data-test-subj="modalSubtitle">
              <p>
                <EuiTextColor color="subdued">
                  {i18n.SHOW_REQUEST_MODAL_SUBTITLE(edit)}
                </EuiTextColor>
              </p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiCodeBlock language="json" isCopyable data-test-subj="modalRequestCodeBlock">
          {`${edit ? 'PUT' : 'POST'} kbn:${BASE_ALERTING_API_PATH}/rule${
            edit ? `/${ruleId}` : ''
          }\n${formattedRequest}`}
        </EuiCodeBlock>
      </EuiModalBody>
    </EuiModal>
  );
};
