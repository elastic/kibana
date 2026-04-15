/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTextColor,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  RequestCodeBlock,
  type ShowRequestActivePage,
  type ShowRequestViewMode,
} from './request_code_block';

const TITLE_CREATE = i18n.translate('xpack.alertingV2.ruleForm.showRequest.titleCreate', {
  defaultMessage: 'Create alerting rule request',
});

const TITLE_UPDATE = i18n.translate('xpack.alertingV2.ruleForm.showRequest.titleUpdate', {
  defaultMessage: 'Update alerting rule request',
});

const SUBTITLE_CREATE = i18n.translate('xpack.alertingV2.ruleForm.showRequest.subtitleCreate', {
  defaultMessage: 'This Kibana request will create this rule.',
});

const SUBTITLE_UPDATE = i18n.translate('xpack.alertingV2.ruleForm.showRequest.subtitleUpdate', {
  defaultMessage: 'This Kibana request will update this rule.',
});

const TAB_CREATE = i18n.translate('xpack.alertingV2.ruleForm.showRequest.tabCreate', {
  defaultMessage: 'Create',
});

const TAB_UPDATE = i18n.translate('xpack.alertingV2.ruleForm.showRequest.tabUpdate', {
  defaultMessage: 'Update',
});

const TITLE_YAML = i18n.translate('xpack.alertingV2.ruleForm.showRequest.titleYaml', {
  defaultMessage: 'Rule YAML configuration',
});

const SUBTITLE_YAML = i18n.translate('xpack.alertingV2.ruleForm.showRequest.subtitleYaml', {
  defaultMessage: 'YAML representation of the current rule configuration.',
});

const VIEW_REQUEST = i18n.translate('xpack.alertingV2.ruleForm.showRequest.viewRequest', {
  defaultMessage: 'Request',
});

const VIEW_YAML = i18n.translate('xpack.alertingV2.ruleForm.showRequest.viewYaml', {
  defaultMessage: 'YAML',
});

const VIEW_FORMAT_LEGEND = i18n.translate(
  'xpack.alertingV2.ruleForm.showRequest.viewFormatLegend',
  {
    defaultMessage: 'Show request or YAML',
  }
);

const viewFormatButtons: Array<{
  id: ShowRequestViewMode;
  label: string;
  'data-test-subj': string;
}> = [
  {
    id: 'request',
    label: VIEW_REQUEST,
    'data-test-subj': 'showRequestViewRequestButton',
  },
  {
    id: 'yaml',
    label: VIEW_YAML,
    'data-test-subj': 'showRequestViewYamlButton',
  },
];

interface ShowRequestModalProps {
  ruleId?: string;
  onClose: () => void;
}

export const ShowRequestModal = ({ ruleId, onClose }: ShowRequestModalProps) => {
  const [activeTab, setActiveTab] = useState<ShowRequestActivePage>(ruleId ? 'update' : 'create');
  const [viewMode, setViewMode] = useState<ShowRequestViewMode>('request');

  const title =
    viewMode === 'yaml' ? TITLE_YAML : activeTab === 'update' ? TITLE_UPDATE : TITLE_CREATE;
  const subtitle =
    viewMode === 'yaml'
      ? SUBTITLE_YAML
      : activeTab === 'update'
      ? SUBTITLE_UPDATE
      : SUBTITLE_CREATE;

  return (
    <EuiModal
      data-test-subj="ruleV2ShowRequestModal"
      aria-labelledby="showRequestModal"
      onClose={onClose}
    >
      <EuiModalHeader>
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiModalHeaderTitle id="showRequestModal" data-test-subj="showRequestModalTitle">
              {title}
            </EuiModalHeaderTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText data-test-subj="showRequestModalSubtitle">
              <p>
                <EuiTextColor color="subdued">{subtitle}</EuiTextColor>
              </p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false} style={{ alignSelf: 'flex-start' }}>
            <EuiButtonGroup
              legend={VIEW_FORMAT_LEGEND}
              options={viewFormatButtons}
              idSelected={viewMode}
              onChange={(id) => setViewMode(id as ShowRequestViewMode)}
              buttonSize="compressed"
              data-test-subj="showRequestViewFormatToggle"
            />
          </EuiFlexItem>
          {ruleId && viewMode === 'request' && (
            <EuiTabs>
              <EuiTab
                isSelected={activeTab === 'create'}
                onClick={() => setActiveTab('create')}
                data-test-subj="showRequestCreateTab"
              >
                {TAB_CREATE}
              </EuiTab>
              <EuiTab
                isSelected={activeTab === 'update'}
                onClick={() => setActiveTab('update')}
                data-test-subj="showRequestUpdateTab"
              >
                {TAB_UPDATE}
              </EuiTab>
            </EuiTabs>
          )}
        </EuiFlexGroup>
      </EuiModalHeader>
      <EuiModalBody>
        <RequestCodeBlock
          activeTab={activeTab}
          viewMode={viewMode}
          ruleId={ruleId}
          data-test-subj="showRequestModalCodeBlock"
        />
      </EuiModalBody>
    </EuiModal>
  );
};
