/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef, useState } from 'react';
import { css } from '@emotion/react';
import {
  ResizableLayout,
  ResizableLayoutDirection,
  ResizableLayoutMode,
  ResizableLayoutOrder,
} from '@kbn/resizable-layout';
import { createHtmlPortalNode, InPortal, OutPortal } from 'react-reverse-portal';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
  EuiTab,
  EuiTabs,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { CoreStart, useService } from '@kbn/core-di-browser';

import {
  CentralizedActionPoliciesPanel,
  DetailsAndArtifactsStep,
  LinkedActionPoliciesStep,
  NotificationsStep,
} from '@kbn/alerting-v2-rule-form';
import type { SequenceFormValues } from '@kbn/alerting-v2-rule-form';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import type { HttpStart } from '@kbn/core/public';
import { SequenceRuleExecutionStep } from './sequence_rule_execution_step';
import { useCanSaveSequenceRule } from './use_can_save_sequence_rule';

const SIDEBAR_WIDTH_KEY = 'SEQUENCE_BUILDER_SIDEBAR_WIDTH';

const fullHeightCss = css`
  height: 100%;
  overflow: hidden;
`;
const DEFAULT_SIDEBAR_WIDTH = 480;
const MIN_SIDEBAR_WIDTH = 400;
const MIN_CANVAS_WIDTH = 400;

type TabId = 'execution' | 'details' | 'actions';

interface SidebarContentProps {
  ruleId: string | undefined;
  seqValues: SequenceFormValues;
  isSaving: boolean;
  onClose: () => void;
  onSave: () => void;
}

const SidebarContent: React.FC<SidebarContentProps> = ({
  ruleId,
  seqValues,
  isSaving,
  onClose,
  onSave,
}) => {
  const http = useService(CoreStart('http')) as HttpStart;
  const [selectedTab, setSelectedTab] = useState<TabId>('execution');
  const canSave = useCanSaveSequenceRule(seqValues, isSaving);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div style={{ flexShrink: 0, padding: '0 16px' }}>
        <EuiTabs data-test-subj="sequenceBuilderDetailsTabs">
          <EuiTab
            isSelected={selectedTab === 'execution'}
            onClick={() => setSelectedTab('execution')}
            data-test-subj="sequenceBuilderExecutionTab"
          >
            <FormattedMessage
              id="xpack.alertingV2.sequenceBuilderPage.sidebar.executionTab"
              defaultMessage="Rule execution"
            />
          </EuiTab>
          <EuiTab
            isSelected={selectedTab === 'details'}
            onClick={() => setSelectedTab('details')}
            data-test-subj="sequenceBuilderDetailsTab"
          >
            <FormattedMessage
              id="xpack.alertingV2.sequenceBuilderPage.sidebar.detailsTab"
              defaultMessage="Details & Artifacts"
            />
          </EuiTab>
          <EuiTab
            isSelected={selectedTab === 'actions'}
            onClick={() => setSelectedTab('actions')}
            data-test-subj="sequenceBuilderActionsTab"
          >
            <FormattedMessage
              id="xpack.alertingV2.sequenceBuilderPage.sidebar.actionsTab"
              defaultMessage="Actions"
            />
          </EuiTab>
        </EuiTabs>
      </div>

      <div
        role="tabpanel"
        style={{ flex: 1, overflow: 'auto', minHeight: 0, padding: '16px 16px 0' }}
      >
        {selectedTab === 'execution' && <SequenceRuleExecutionStep seqValues={seqValues} />}
        {selectedTab === 'details' && <DetailsAndArtifactsStep />}
        {selectedTab === 'actions' && (
          <>
            <CentralizedActionPoliciesPanel http={http} />
            <EuiSpacer size="m" />
            <LinkedActionPoliciesStep http={http} ruleId={ruleId} />
            <EuiHorizontalRule margin="m" />
            <NotificationsStep />
          </>
        )}
      </div>

      <div style={{ flexShrink: 0 }}>
        <EuiHorizontalRule margin="none" />
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" style={{ padding: '12px 16px' }}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={onClose}
              disabled={isSaving}
              data-test-subj="sequenceBuilderSidebarCancel"
            >
              <FormattedMessage
                id="xpack.alertingV2.sequenceBuilderPage.sidebar.cancel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={onSave}
              isLoading={isSaving}
              isDisabled={!canSave}
              data-test-subj="sequenceBuilderSidebarSave"
            >
              <FormattedMessage
                id="xpack.alertingV2.sequenceBuilderPage.sidebar.save"
                defaultMessage="Save"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </div>
  );
};

export interface SequenceBuilderDetailsSidebarProps {
  canvas: React.ReactNode;
  sidebarOpen: boolean;
  ruleId: string | undefined;
  seqValues: SequenceFormValues;
  isSaving: boolean;
  onCloseSidebar: () => void;
  onSave: () => void;
}

export const SequenceBuilderDetailsSidebar: React.FC<SequenceBuilderDetailsSidebarProps> = ({
  canvas,
  sidebarOpen,
  ruleId,
  seqValues,
  isSaving,
  onCloseSidebar,
  onSave,
}) => {
  const canvasPortalNode = useRef(
    createHtmlPortalNode({ attributes: { class: 'eui-fullHeight' } })
  ).current;
  const sidebarPortalNode = useRef(
    createHtmlPortalNode({ attributes: { class: 'eui-fullHeight' } })
  ).current;

  const [sidebarWidth = DEFAULT_SIDEBAR_WIDTH, setSidebarWidth] = useLocalStorage(
    SIDEBAR_WIDTH_KEY,
    DEFAULT_SIDEBAR_WIDTH
  );

  return (
    <>
      <InPortal node={canvasPortalNode}>{canvas}</InPortal>

      {sidebarOpen && (
        <InPortal node={sidebarPortalNode}>
          <SidebarContent
            ruleId={ruleId}
            seqValues={seqValues}
            isSaving={isSaving}
            onClose={onCloseSidebar}
            onSave={onSave}
          />
        </InPortal>
      )}

      {!sidebarOpen ? (
        <div css={fullHeightCss}>
          <OutPortal node={canvasPortalNode} />
        </div>
      ) : (
        <ResizableLayout
          css={fullHeightCss}
          flexPanel={<OutPortal node={canvasPortalNode} />}
          minFlexPanelSize={MIN_CANVAS_WIDTH}
          fixedPanel={
            <div style={{ position: 'relative', height: '100%' }}>
              <OutPortal node={sidebarPortalNode} />
            </div>
          }
          fixedPanelSize={sidebarWidth ?? DEFAULT_SIDEBAR_WIDTH}
          onFixedPanelSizeChange={setSidebarWidth}
          minFixedPanelSize={MIN_SIDEBAR_WIDTH}
          fixedPanelOrder={ResizableLayoutOrder.End}
          mode={ResizableLayoutMode.Resizable}
          direction={ResizableLayoutDirection.Horizontal}
          resizeButtonClassName="sequenceBuilderSidebarResizeButton"
          data-test-subj="sequenceBuilderResizableLayout"
        />
      )}
    </>
  );
};
