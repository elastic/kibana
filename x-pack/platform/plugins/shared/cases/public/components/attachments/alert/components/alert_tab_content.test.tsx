/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { BulkActionsPanelConfig, TimelineItem } from '@kbn/response-ops-alerts-table/types';
import type { CommonAttachmentListViewProps } from '../../../../client/attachment_framework/types';
import { StackAlertTabContent, REMOVE_STACK_ALERTS_FROM_CASE_TEST_ID } from './alert_tab_content';
import type { StackAlertsTableContext } from './stack_alert_actions_cell';
import { StackAlertActionsCell } from './stack_alert_actions_cell';

interface MockAlertsTableProps {
  additionalBulkActions?: BulkActionsPanelConfig[];
  additionalContext?: StackAlertsTableContext;
  renderActionsCell?: unknown;
}

const mockAlertsTable = jest.fn((_props: MockAlertsTableProps) => (
  <div data-test-subj="alerts-table" />
));

jest.mock('@kbn/response-ops-alerts-table', () => ({
  AlertsTable: (props: MockAlertsTableProps) => mockAlertsTable(props),
}));
jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: () => ({ services: {} }),
}));
jest.mock('../../../../containers/use_get_feature_ids', () => ({
  useGetFeatureIds: () => ({ isLoading: false, data: { ruleTypeIds: [], featureIds: [] } }),
}));
jest.mock('../../../../../common/utils/attachments/manual_alert_ids', () => ({
  getManualAlertIds: () => ['alert-1', 'alert-2'],
}));

const caseData = {
  id: 'case-1',
  owner: 'cases',
  comments: [],
} as unknown as CommonAttachmentListViewProps['caseData'];

const getTableProps = (): MockAlertsTableProps | undefined =>
  mockAlertsTable.mock.calls.at(-1)?.[0];

const getBulkActions = (): BulkActionsPanelConfig[] | undefined =>
  getTableProps()?.additionalBulkActions;

const toAlerts = (ids: string[]): TimelineItem[] =>
  ids.map((_id) => ({ _id, data: [], ecs: { _id } }));

describe('StackAlertTabContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('adds no bulk action without onRemove', () => {
    render(<StackAlertTabContent caseData={caseData} />);

    expect(getBulkActions()).toBeUndefined();
  });

  it('removes the selected alerts by their ids and clears the selection on success', () => {
    const onRemove = jest.fn();
    const clearSelection = jest.fn();
    render(<StackAlertTabContent caseData={caseData} onRemove={onRemove} />);

    const [removeAction] = getBulkActions()?.[0].items ?? [];
    expect(removeAction).toEqual(
      expect.objectContaining({ key: REMOVE_STACK_ALERTS_FROM_CASE_TEST_ID, disableOnQuery: true })
    );

    removeAction.onClick?.(toAlerts(['alert-2']), false, jest.fn(), clearSelection, jest.fn());

    expect(onRemove).toHaveBeenCalledWith(
      { attachmentIds: ['alert-2'] },
      { onSuccess: clearSelection }
    );
  });

  it('passes a new bulk actions panel on each render', () => {
    const onRemove = jest.fn();
    const { rerender } = render(<StackAlertTabContent caseData={caseData} onRemove={onRemove} />);
    const [firstPanel] = getBulkActions() ?? [];

    rerender(<StackAlertTabContent caseData={caseData} onRemove={onRemove} />);

    expect(getBulkActions()?.[0]).not.toBe(firstPanel);
  });

  it('adds no row actions without onRemove', () => {
    render(<StackAlertTabContent caseData={caseData} />);

    expect(getTableProps()?.renderActionsCell).toBeUndefined();
    expect(getTableProps()?.additionalContext?.onRemoveFromCase).toBeUndefined();
  });

  it('removes a single alert from the row actions', () => {
    const onRemove = jest.fn();
    render(<StackAlertTabContent caseData={caseData} onRemove={onRemove} />);

    expect(getTableProps()?.renderActionsCell).toBe(StackAlertActionsCell);

    getTableProps()?.additionalContext?.onRemoveFromCase?.('alert-1');

    expect(onRemove).toHaveBeenCalledWith({ attachmentIds: ['alert-1'] });
  });
});
