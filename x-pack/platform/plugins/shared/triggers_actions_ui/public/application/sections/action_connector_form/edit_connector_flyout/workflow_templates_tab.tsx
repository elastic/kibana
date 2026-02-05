/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFlexGrid,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSearchBar,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useState } from 'react';
import { useKibana } from '../../../../common/lib/kibana';
import type { ActionConnector } from '../../../../types';

interface WorkflowTemplatesTabProps {
  connector: ActionConnector;
}

// Inner component that uses the workflow hooks
const WorkflowTemplatesContent: React.FC<{
  connector: ActionConnector;
  connectorType: string;
  workflowsManagement: any;
}> = ({ connector, connectorType, workflowsManagement }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const { useWorkflowTemplates, TemplateCard } = workflowsManagement;
  const {
    data: templates,
    isLoading,
    error,
  } = useWorkflowTemplates({
    connectorType,
    connectorId: connector.id,
    search: searchQuery || undefined,
  });

  if (isLoading) {
    return (
      <EuiEmptyPrompt
        icon={<EuiLoadingSpinner size="xl" />}
        title={
          <h2>
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.editConnectorForm.workflowTemplates.loading"
              defaultMessage="Loading workflow templates..."
            />
          </h2>
        }
      />
    );
  }

  if (error) {
    return (
      <EuiEmptyPrompt
        iconType="error"
        color="danger"
        title={
          <h2>
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.editConnectorForm.workflowTemplates.error"
              defaultMessage="Failed to load workflow templates"
            />
          </h2>
        }
        body={
          <p>
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.editConnectorForm.workflowTemplates.errorDescription"
              defaultMessage="An error occurred while loading workflow templates. Please try again later."
            />
          </p>
        }
      />
    );
  }

  if (!templates || templates.length === 0) {
    return (
      <EuiEmptyPrompt
        iconType="documents"
        title={
          <h2>
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.editConnectorForm.workflowTemplates.noTemplates"
              defaultMessage="No workflow templates available"
            />
          </h2>
        }
        body={
          <p>
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.editConnectorForm.workflowTemplates.noTemplatesDescription"
              defaultMessage="There are no workflow templates available for this connector type yet. Check back later or create your own workflow."
            />
          </p>
        }
      />
    );
  }

  return (
    <>
      <EuiText size="s" color="subdued">
        <p>
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.editConnectorForm.workflowTemplates.description"
            defaultMessage="Browse and use pre-built workflow templates that integrate with this connector. Templates are automatically configured with your connector ID."
          />
        </p>
      </EuiText>

      <EuiSpacer size="m" />

      <EuiSearchBar
        query={searchQuery}
        onChange={(args) => setSearchQuery(args.queryText)}
        box={{
          placeholder: i18n.translate(
            'xpack.triggersActionsUI.sections.editConnectorForm.workflowTemplates.searchPlaceholder',
            {
              defaultMessage: 'Search templates...',
            }
          ),
        }}
      />

      <EuiSpacer size="l" />

      <EuiFlexGrid columns={3} gutterSize="l">
        {templates?.map((template: any) => (
          <EuiFlexItem key={template.id}>
            <TemplateCard
              template={template}
              connectorId={connector.id}
              connectorType={connectorType}
              showRegisterCheckbox={false}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
    </>
  );
};

// Main component that handles conditional rendering
export const WorkflowTemplatesTab: React.FC<WorkflowTemplatesTabProps> = ({ connector }) => {
  const kibana = useKibana();
  const workflowsManagement = (kibana.services as any).workflowsManagement;

  // Get the connector type - action types have a leading dot (e.g., ".slack")
  // We need to strip it to match workflow step types
  const connectorType = connector.actionTypeId.startsWith('.')
    ? connector.actionTypeId.substring(1)
    : connector.actionTypeId;

  // Check if workflows management is available
  if (!workflowsManagement) {
    return (
      <EuiCallOut
        announceOnMount
        title={
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.editConnectorForm.workflowTemplates.unavailableTitle"
            defaultMessage="Workflow Templates Unavailable"
          />
        }
        color="warning"
        iconType="iInCircle"
      >
        <p>
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.editConnectorForm.workflowTemplates.unavailableDescription"
            defaultMessage="The Workflows Management plugin is not available. Please ensure it is installed and enabled to use workflow templates."
          />
        </p>
      </EuiCallOut>
    );
  }

  return (
    <WorkflowTemplatesContent
      connector={connector}
      connectorType={connectorType}
      workflowsManagement={workflowsManagement}
    />
  );
};
