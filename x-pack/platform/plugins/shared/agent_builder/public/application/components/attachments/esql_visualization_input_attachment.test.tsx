/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  AttachmentType,
  type EsqlVisualizationInputAttachment,
} from '@kbn/agent-builder-common/attachments';
import type { AgentBuilderStartDependencies } from '../../../types';
import { VisualizeESQL } from '../tools/esql/visualize_esql';
import { createEsqlVisualizationInputAttachmentDefinition } from './esql_visualization_input_attachment';

jest.mock('../tools/esql/visualize_esql', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const _React = require('react');
  return {
    VisualizeESQL: jest.fn(() =>
      _React.createElement('span', { 'data-test-subj': 'visualize-esql' })
    ),
  };
});

const mockVisualizeESQL = VisualizeESQL as jest.MockedFunction<typeof VisualizeESQL>;

const createStartDependencies = (): AgentBuilderStartDependencies =>
  ({
    lens: {},
    dataViews: {},
    uiActions: {},
  } as AgentBuilderStartDependencies);

describe('createEsqlVisualizationInputAttachmentDefinition', () => {
  beforeEach(() => {
    mockVisualizeESQL.mockClear();
  });

  it('renders lightweight ES|QL visualization input with VisualizeESQL', async () => {
    const startDependencies = createStartDependencies();
    const attachment: EsqlVisualizationInputAttachment = {
      id: 'esql-vis-input-1',
      type: AttachmentType.esqlVisualizationInput,
      data: {
        query: 'FROM logs-* | STATS count = COUNT() BY BUCKET(@timestamp, 1h)',
        columns: [
          { name: '@timestamp', type: 'date' },
          { name: 'count', type: 'long' },
        ],
        chart_type: 'xy',
        time_range: { from: 'now-24h', to: 'now' },
      },
    };

    const definition = createEsqlVisualizationInputAttachmentDefinition({ startDependencies });

    render(
      <>
        {definition.renderInlineContent?.({
          attachment,
          isSidebar: false,
        })}
      </>
    );

    expect(await screen.findByTestId('visualize-esql')).toBeInTheDocument();
    expect(mockVisualizeESQL.mock.calls[0][0]).toMatchObject({
      lens: startDependencies.lens,
      dataViews: startDependencies.dataViews,
      uiActions: startDependencies.uiActions,
      esqlQuery: attachment.data.query,
      esqlColumns: attachment.data.columns,
      preferredChartType: attachment.data.chart_type,
      timeRange: attachment.data.time_range,
    });
  });
});
