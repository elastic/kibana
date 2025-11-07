/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import type { Node } from '@xyflow/react';
import { Handle, Position } from '@xyflow/react';
import {
  EuiCard,
  EuiText,
  EuiSpacer,
  EuiLoadingSpinner,
  EuiCallOut,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiTheme,
} from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ScratchpadNodeData } from '../../hooks/use_scratchpad_state';
import { useAlertQuery } from '../../hooks/use_alert_query';
import { useScratchpadNodeContext } from '../scratchpad_canvas/node_context';

interface AlertNodeData extends ScratchpadNodeData {
  type: 'alert';
  alertId: string;
}

interface AlertNodeProps {
  node: Node<AlertNodeData>;
}

export function AlertNode({ node }: AlertNodeProps) {
  const nodeData = node.data;
  const { euiTheme } = useEuiTheme();
  const { onUpdateNode } = useScratchpadNodeContext();
  const {
    services: { application },
  } = useKibana();
  const isSelected = nodeData.selected || false;

  const { loading, error, alert, fetchAlert } = useAlertQuery();

  // Fetch alert when node is created or alertId changes
  useEffect(() => {
    if (nodeData.alertId) {
      fetchAlert(nodeData.alertId);
    }
  }, [nodeData.alertId, fetchAlert]);

  // Update node with alert data when fetched
  useEffect(() => {
    if (alert && onUpdateNode) {
      onUpdateNode(node.id, {
        data: {
          ...nodeData,
          alert,
        },
      });
    }
  }, [alert, node.id, nodeData, onUpdateNode]);

  const getAlertTitle = () => {
    if (!alert) return 'Alert';
    // Prefer alert title, then rule name, then rule UUID
    const alertTitle = (alert as any)['kibana.alert.title'];
    const ruleName = (alert as any)['kibana.alert.rule.name'];
    const ruleUuid = (alert as any)['kibana.alert.rule.uuid'];
    return alertTitle || ruleName || ruleUuid || 'Alert';
  };

  const getAlertFields = () => {
    if (!alert) return [];

    const fields: Array<{ title: string; description: string }> = [];

    // Alert title (if not already shown in card title)
    const alertTitle = (alert as any)['kibana.alert.title'];
    const cardTitle = getAlertTitle();
    if (alertTitle && alertTitle !== cardTitle) {
      fields.push({
        title: 'Title',
        description: alertTitle,
      });
    }

    // Alert reason (important - show early)
    if ((alert as any)['kibana.alert.reason']) {
      fields.push({
        title: 'Reason',
        description: (alert as any)['kibana.alert.reason'],
      });
    }

    // Rule information
    if ((alert as any)['kibana.alert.rule.name']) {
      fields.push({
        title: 'Rule Name',
        description: (alert as any)['kibana.alert.rule.name'],
      });
    }

    if ((alert as any)['kibana.alert.rule.uuid']) {
      fields.push({
        title: 'Rule ID',
        description: (alert as any)['kibana.alert.rule.uuid'],
      });
    }

    // Alert status
    if ((alert as any)['kibana.alert.status']) {
      fields.push({
        title: 'Status',
        description: (alert as any)['kibana.alert.status'],
      });
    }

    // Severity
    if ((alert as any)['kibana.alert.severity']) {
      fields.push({
        title: 'Severity',
        description: (alert as any)['kibana.alert.severity'],
      });
    }

    // Timestamp
    if ((alert as any)['@timestamp']) {
      fields.push({
        title: 'Timestamp',
        description: new Date((alert as any)['@timestamp']).toLocaleString(),
      });
    }

    // Alert ID
    if ((alert as any)._id) {
      fields.push({
        title: 'Alert ID',
        description: (alert as any)._id,
      });
    }

    return fields;
  };

  const handleViewAlertDetails = () => {
    if (!alert || !application) return;
    // Use alert UUID if available, otherwise use the alert ID from node data
    const alertUuid = (alert as any)['kibana.alert.uuid'] || nodeData.alertId;
    if (alertUuid) {
      application.navigateToApp('observability', {
        path: `/alerts/${encodeURIComponent(alertUuid)}`,
      });
    }
  };

  const getAlertUuid = () => {
    if (!alert) return null;
    return (alert as any)['kibana.alert.uuid'] || nodeData.alertId || null;
  };

  return (
    <div>
      <Handle type="target" position={Position.Top} />
      <EuiCard
        title={
          <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>{getAlertTitle()}</EuiFlexItem>
            {getAlertUuid() && (
              <EuiFlexItem grow={false}>
                <EuiButton
                  size="s"
                  iconType="popout"
                  onClick={handleViewAlertDetails}
                  title="View alert details"
                >
                  View Alert
                </EuiButton>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        }
        style={{
          minWidth: '350px',
          maxWidth: '600px',
          border: isSelected
            ? `2px solid ${euiTheme.colors.primary}`
            : `1px solid ${euiTheme.colors.plainDark}`,
          boxShadow: isSelected ? `0 0 0 2px ${euiTheme.colors.primary}20` : 'none',
        }}
        textAlign="left"
      >
        {loading && (
          <>
            <EuiLoadingSpinner size="m" />
            <EuiSpacer size="s" />
            <EuiText size="s" color="subdued">
              Loading alert details...
            </EuiText>
          </>
        )}

        {error && !loading && (
          <>
            <EuiCallOut title="Error" color="danger" size="s" announceOnMount={false}>
              {error}
            </EuiCallOut>
            {nodeData.alertId && (
              <>
                <EuiSpacer size="s" />
                <EuiText size="xs" color="subdued">
                  Alert ID: {nodeData.alertId}
                </EuiText>
              </>
            )}
          </>
        )}

        {alert && !loading && (
          <>
            <EuiDescriptionList type="column" compressed>
              {getAlertFields().map((field, idx) => (
                <React.Fragment key={idx}>
                  <EuiDescriptionListTitle>{field.title}</EuiDescriptionListTitle>
                  <EuiDescriptionListDescription>{field.description}</EuiDescriptionListDescription>
                </React.Fragment>
              ))}
            </EuiDescriptionList>
            {nodeData.alertId && (
              <>
                <EuiSpacer size="s" />
                <EuiText size="xs" color="subdued">
                  Alert ID: {nodeData.alertId}
                </EuiText>
              </>
            )}
          </>
        )}

        {!alert && !loading && !error && nodeData.alertId && (
          <EuiText size="s" color="subdued">
            No alert data available for ID: {nodeData.alertId}
          </EuiText>
        )}
      </EuiCard>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
