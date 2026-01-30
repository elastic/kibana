/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiText,
  EuiTextColor,
} from '@elastic/eui';
import React, { useCallback } from 'react';
import { RequestCodeBlock } from '../components';
import { SHOW_REQUEST_MODAL_SUBTITLE, SHOW_REQUEST_MODAL_TITLE } from '../translations';
import { useRuleFormScreenContext } from '../hooks';

export interface RulePageShowRequestModalProps {
  isEdit?: boolean;
}

export const RulePageShowRequestModal = (props: RulePageShowRequestModalProps) => {
  const { isEdit = false } = props;
  const { setIsShowRequestScreenVisible } = useRuleFormScreenContext();

  const onClose = useCallback(() => {
    setIsShowRequestScreenVisible(false);
  }, [setIsShowRequestScreenVisible]);

  return (
    <EuiModal
      data-test-subj="rulePageShowRequestModal"
      aria-labelledby="showRequestModal"
      onClose={onClose}
    >
      <EuiModalHeader>
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiModalHeaderTitle id="showRequestModal" data-test-subj="modalHeaderTitle">
              {SHOW_REQUEST_MODAL_TITLE(isEdit)}
            </EuiModalHeaderTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText data-test-subj="modalSubtitle">
              <p>
                <EuiTextColor color="subdued">{SHOW_REQUEST_MODAL_SUBTITLE(isEdit)}</EuiTextColor>
              </p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalHeader>
      <EuiModalBody>
        <RequestCodeBlock isEdit={isEdit} data-test-subj="modalRequestCodeBlock" />
      </EuiModalBody>
    </EuiModal>
  );
};
