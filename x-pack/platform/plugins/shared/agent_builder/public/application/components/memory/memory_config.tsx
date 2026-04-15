/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBasicTable, EuiCallOut, EuiDescriptionList, EuiSpacer, EuiTitle } from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { i18n } from '@kbn/i18n';

const TOKEN_BUDGET_ITEMS = [
  { stage: 'round_start', budget: '800 tokens', description: 'Injected before agent reasoning' },
  { stage: 'tool_checkpoint', budget: '400 tokens', description: 'Injected at each tool call' },
  { stage: 'final_answer', budget: '600 tokens', description: 'Injected before final answer' },
  { stage: 'memory_expand', budget: '1200 tokens', description: 'Used by remember() tool' },
];

const tokenBudgetColumns = [
  {
    field: 'stage',
    name: i18n.translate('xpack.agentBuilder.memory.config.tokenBudget.stageColumn', {
      defaultMessage: 'Stage',
    }),
  },
  {
    field: 'budget',
    name: i18n.translate('xpack.agentBuilder.memory.config.tokenBudget.budgetColumn', {
      defaultMessage: 'Token budget',
    }),
  },
  {
    field: 'description',
    name: i18n.translate('xpack.agentBuilder.memory.config.tokenBudget.descriptionColumn', {
      defaultMessage: 'Description',
    }),
  },
];

export const AgentBuilderMemoryConfig: React.FC = () => {
  return (
    <KibanaPageTemplate data-test-subj="agentBuilderMemoryConfigPage">
      <KibanaPageTemplate.Header
        pageTitle={i18n.translate('xpack.agentBuilder.memory.config.pageTitle', {
          defaultMessage: 'Memory Configuration',
        })}
        description={i18n.translate('xpack.agentBuilder.memory.config.pageDescription', {
          defaultMessage:
            'Current memory system configuration. To change these settings, update your kibana.yml.',
        })}
        css={({ euiTheme }: { euiTheme: { colors: { backgroundBasePlain: string } } }) => ({
          backgroundColor: euiTheme.colors.backgroundBasePlain,
          borderBlockEnd: 'none',
        })}
      />
      <KibanaPageTemplate.Section>
        <EuiCallOut
          title={i18n.translate('xpack.agentBuilder.memory.config.readonlyNotice.title', {
            defaultMessage: 'Configuration is read-only in the UI',
          })}
          color="primary"
          iconType="iInCircle"
        >
          <p>
            {i18n.translate('xpack.agentBuilder.memory.config.readonlyNotice.body', {
              defaultMessage:
                'Memory system configuration is managed via kibana.yml. This page shows the current defaults. Full configuration UI is planned for a future release.',
            })}
          </p>
        </EuiCallOut>

        <EuiSpacer size="l" />

        <EuiTitle size="s">
          <h3>
            {i18n.translate('xpack.agentBuilder.memory.config.embeddingModel.title', {
              defaultMessage: 'Embedding model',
            })}
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiDescriptionList
          listItems={[
            {
              title: i18n.translate('xpack.agentBuilder.memory.config.embeddingModel.model', {
                defaultMessage: 'Model',
              }),
              description: 'ELSER (Elastic Learned Sparse EncodeR)',
            },
            {
              title: i18n.translate('xpack.agentBuilder.memory.config.embeddingModel.dimensions', {
                defaultMessage: 'Dimensions',
              }),
              description: '768 (dense vector cosine similarity)',
            },
            {
              title: i18n.translate(
                'xpack.agentBuilder.memory.config.embeddingModel.configuration',
                {
                  defaultMessage: 'Configuration',
                }
              ),
              description: 'xpack.agentBuilder.memory.embeddingModel in kibana.yml',
            },
          ]}
        />

        <EuiSpacer size="l" />

        <EuiTitle size="s">
          <h3>
            {i18n.translate('xpack.agentBuilder.memory.config.tokenBudgets.title', {
              defaultMessage: 'Token budgets per stage',
            })}
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiBasicTable
          tableCaption={i18n.translate('xpack.agentBuilder.memory.config.tokenBudgets.caption', {
            defaultMessage: 'Token budgets per retrieval stage',
          })}
          items={TOKEN_BUDGET_ITEMS}
          columns={tokenBudgetColumns}
          data-test-subj="agentBuilderMemoryConfigTokenBudgets"
        />

        <EuiSpacer size="l" />

        <EuiTitle size="s">
          <h3>
            {i18n.translate('xpack.agentBuilder.memory.config.consolidation.title', {
              defaultMessage: 'Consolidation schedule',
            })}
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiDescriptionList
          listItems={[
            {
              title: i18n.translate('xpack.agentBuilder.memory.config.consolidation.schedule', {
                defaultMessage: 'Schedule',
              }),
              description: 'Nightly at 02:00 (every 24 hours)',
            },
            {
              title: i18n.translate('xpack.agentBuilder.memory.config.consolidation.maxRuntime', {
                defaultMessage: 'Max runtime',
              }),
              description: '30 minutes per run',
            },
            {
              title: i18n.translate('xpack.agentBuilder.memory.config.consolidation.batchSize', {
                defaultMessage: 'Batch size',
              }),
              description: '100 memories per run',
            },
            {
              title: i18n.translate('xpack.agentBuilder.memory.config.consolidation.taskId', {
                defaultMessage: 'Task Manager ID',
              }),
              description: 'agent_builder:memory_consolidation',
            },
          ]}
        />
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
