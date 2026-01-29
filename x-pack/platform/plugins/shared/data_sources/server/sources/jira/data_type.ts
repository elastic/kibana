import { DataSource } from '@kbn/data-catalog-plugin';
import { i18n } from '@kbn/i18n';
import { generateSearchIssuesWithJqlWorkflow } from './workflows';

export const jiraDataSource: DataSource = {
  id: 'jira',
  name: 'Jira',
  description: i18n.translate('xpack.dataSources.jira.description', {
    defaultMessage: 'Connect to Jira to pull data from your project.',
  }),

  stackConnector: {
    type: '.jira',
    config: {},
  },
  generateWorkflows(stackConnectorId: string) {
    return [
      {
        content: generateSearchIssuesWithJqlWorkflow(stackConnectorId),
        shouldGenerateABTool: false,
      },
    ];
  },
};
