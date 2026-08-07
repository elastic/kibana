/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIconTip,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { MemoryWorkflowStatus, MemoryWorkflowType } from '@kbn/agent-memory-common';
import { i18n } from '@kbn/i18n';
import React from 'react';

const WORKFLOW_LABELS: Record<MemoryWorkflowType, { label: string; description: string }> = {
  consolidation: {
    label: i18n.translate('xpack.contextEngine.memory.workflow.consolidationLabel', {
      defaultMessage: 'Consolidation',
    }),
    description: i18n.translate('xpack.contextEngine.memory.workflow.consolidationDescription', {
      defaultMessage:
        'Merges duplicate pages, prunes stale ones, and fixes categories. Runs daily.',
    }),
  },
  conversation_scraper: {
    label: i18n.translate('xpack.contextEngine.memory.workflow.scraperLabel', {
      defaultMessage: 'Conversation scraping',
    }),
    description: i18n.translate('xpack.contextEngine.memory.workflow.scraperDescription', {
      defaultMessage:
        'Distils durable knowledge out of recent agent conversations. Runs every four hours.',
    }),
  },
  gap_detection: {
    label: i18n.translate('xpack.contextEngine.memory.workflow.gapDetectionLabel', {
      defaultMessage: 'Gap detection',
    }),
    description: i18n.translate('xpack.contextEngine.memory.workflow.gapDetectionDescription', {
      defaultMessage:
        'Audits coverage and writes a gaps report to the _gaps/overview page. Runs weekly.',
    }),
  },
};

interface MemoryMaintenancePanelProps {
  workflows: MemoryWorkflowStatus[];
  canManage: boolean;
  isUpdating: boolean;
  onToggleAll: (enabled: boolean) => void;
  onToggleWorkflow: (type: MemoryWorkflowType, enabled: boolean) => void;
  onRunWorkflow: (type: MemoryWorkflowType) => void;
}

export const MemoryMaintenancePanel = ({
  workflows,
  canManage,
  isUpdating,
  onToggleAll,
  onToggleWorkflow,
  onRunWorkflow,
}: MemoryMaintenancePanelProps) => {
  const allEnabled = workflows.length > 0 && workflows.every((workflow) => workflow.enabled);

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj="contextMemoryMaintenancePanel">
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem grow>
          <EuiTitle size="xxs">
            <h4>
              {i18n.translate('xpack.contextEngine.memory.maintenanceTitle', {
                defaultMessage: 'Background curation',
              })}
            </h4>
          </EuiTitle>
          <EuiSpacer size="xs" />
          <EuiText size="s" color="subdued">
            {i18n.translate('xpack.contextEngine.memory.maintenanceDescription', {
              defaultMessage:
                'Scheduled jobs that keep the knowledge base tidy. Each one calls your AI connector when it runs.',
            })}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSwitch
            label={i18n.translate('xpack.contextEngine.memory.maintenanceToggleLabel', {
              defaultMessage: 'All jobs',
            })}
            checked={allEnabled}
            disabled={!canManage || isUpdating || workflows.length === 0}
            onChange={(event) => onToggleAll(event.target.checked)}
            data-test-subj="contextMemoryToggleMaintenanceSwitch"
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      {workflows.map((workflow) => {
        const labels = WORKFLOW_LABELS[workflow.type];
        return (
          <React.Fragment key={workflow.type}>
            <EuiHorizontalRule margin="s" />
            <EuiFlexGroup
              alignItems="center"
              gutterSize="s"
              responsive={false}
              data-test-subj={`contextMemoryWorkflowRow-${workflow.type}`}
            >
              <EuiFlexItem grow>
                <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiText size="s">{labels.label}</EuiText>
                  </EuiFlexItem>
                  {!workflow.installed && (
                    <EuiFlexItem grow={false}>
                      {/* Without this the switch is simply dead, with nothing saying why. */}
                      <EuiBadge color="warning">
                        {i18n.translate('xpack.contextEngine.memory.workflowNotInstalled', {
                          defaultMessage: 'Not installed',
                        })}
                      </EuiBadge>
                    </EuiFlexItem>
                  )}
                  {workflow.failure && (
                    <EuiFlexItem grow={false}>
                      {/* Per-workflow failures render on their own row rather than as
                          one opaque toast for the whole set. */}
                      <EuiIconTip
                        type="warning"
                        color="warning"
                        content={workflow.failure}
                        aria-label={workflow.failure}
                      />
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
                <EuiText size="xs" color="subdued">
                  {labels.description}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="s"
                  iconType="play"
                  isDisabled={!canManage || !workflow.enabled || !workflow.installed}
                  onClick={() => onRunWorkflow(workflow.type)}
                  data-test-subj={`contextMemoryRunWorkflowButton-${workflow.type}`}
                >
                  {i18n.translate('xpack.contextEngine.memory.runWorkflowLabel', {
                    defaultMessage: 'Run now',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiSwitch
                  showLabel={false}
                  label={labels.label}
                  checked={workflow.enabled}
                  disabled={!canManage || isUpdating || !workflow.installed}
                  onChange={(event) => onToggleWorkflow(workflow.type, event.target.checked)}
                  data-test-subj={`contextMemoryWorkflowSwitch-${workflow.type}`}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </React.Fragment>
        );
      })}
    </EuiPanel>
  );
};
