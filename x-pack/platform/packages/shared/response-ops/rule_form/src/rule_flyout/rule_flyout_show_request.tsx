/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiText,
  EuiTitle,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTabs,
  EuiTab,
} from '@elastic/eui';
import React, { useState } from 'react';
import {
  SHOW_REQUEST_MODAL_SUBTITLE,
  SHOW_REQUEST_MODAL_TITLE,
  RULE_FLYOUT_FOOTER_BACK_TEXT,
  RULE_FLYOUT_HEADER_BACK_TEXT,
  SHOW_REQUEST_MODAL_CREATE_TAB,
  SHOW_REQUEST_MODAL_UPDATE_TAB,
} from '../translations';
import { RequestCodeBlock } from '../components';
import type { ShowRequestActivePage } from '../types';

interface RuleFlyoutShowRequestProps {
  onClose: () => void;
}

export const RuleFlyoutShowRequest = ({ onClose }: RuleFlyoutShowRequestProps) => {
  const [activeTab, setActiveTab] = useState<ShowRequestActivePage>('create');

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="arrowLeft"
              onClick={onClose}
              aria-label={RULE_FLYOUT_HEADER_BACK_TEXT}
              color="text"
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="xs" data-test-subj="ruleFlyoutShowRequestTitle">
              <h4 id="flyoutTitle">{SHOW_REQUEST_MODAL_TITLE(activeTab)}</h4>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <p>
          <EuiText color="subdued">{SHOW_REQUEST_MODAL_SUBTITLE(activeTab)}</EuiText>
        </p>
        <EuiSpacer />

        <EuiFlexItem>
          <EuiTabs>
            <EuiTab
              isSelected={activeTab === 'create'}
              onClick={() => setActiveTab('create')}
              data-test-subj="showRequestCreateTab"
            >
              {SHOW_REQUEST_MODAL_CREATE_TAB}
            </EuiTab>
            <EuiTab
              isSelected={activeTab === 'update'}
              onClick={() => setActiveTab('update')}
              data-test-subj="showRequestCreateTab"
            >
              {SHOW_REQUEST_MODAL_UPDATE_TAB}
            </EuiTab>
          </EuiTabs>
        </EuiFlexItem>

        <RequestCodeBlock data-test-subj="flyoutRequestCodeBlock" activeTab={activeTab} />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiButtonEmpty
          iconType="arrowLeft"
          onClick={onClose}
          data-test-subj="ruleFlyoutShowRequestBackButton"
        >
          {RULE_FLYOUT_FOOTER_BACK_TEXT}
        </EuiButtonEmpty>
      </EuiFlyoutFooter>
    </>
  );
};
