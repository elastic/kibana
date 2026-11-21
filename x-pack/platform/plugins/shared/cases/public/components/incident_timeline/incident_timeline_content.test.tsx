/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { INCIDENT_TIMELINE_ENTRY_ATTACHMENT_TYPE } from '../../../common/constants/attachments';
import type { CaseUI } from '../../../common/ui/types';
import { renderWithTestingProviders } from '../../common/mock';
import { basicCase } from '../../containers/mock';
import { useCreateAttachments } from '../../containers/use_create_attachments';
import { useDeleteComment } from '../../containers/use_delete_comment';
import { IncidentTimelineContent } from './incident_timeline_content';
import { useCaseStatusChanges, useIncidentTimelineAlerts } from './use_incident_timeline_data';

jest.mock('./use_incident_timeline_data');
jest.mock('./renderer/elastic_charts_renderer', () => ({ ElasticChartsRenderer: () => null }));
jest.mock('../../containers/use_delete_comment');
jest.mock('../../containers/use_create_attachments');
jest.mock('../case_view/use_on_refresh_case_view_page', () => ({
  useRefreshCaseViewPage: () => jest.fn(),
}));

const deleteMutate = jest.fn();

const entryAttachment = {
  id: 'entry-1',
  version: 'WzEsMV0=',
  type: INCIDENT_TIMELINE_ENTRY_ATTACHMENT_TYPE,
  data: { title: 'User pasted ClickFix command', occurredAt: '2026-09-01T09:05:00.000Z' },
  createdBy: { username: 'analyst', fullName: 'Analyst' },
};

const caseData = { ...basicCase, comments: [entryAttachment] } as unknown as CaseUI;

const openTableAndDelete = async () => {
  renderWithTestingProviders(<IncidentTimelineContent caseData={caseData} />);
  await userEvent.click(screen.getByText('Table'));
  await userEvent.click(screen.getByTestId('incident-timeline-table-entry-delete'));
};

describe('IncidentTimelineContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useIncidentTimelineAlerts as jest.Mock).mockReturnValue({
      data: { alerts: [], attached: 0, notFound: 0, remote: 0, atLimit: false },
      isLoading: false,
      isError: false,
    });
    (useCaseStatusChanges as jest.Mock).mockReturnValue({ data: [] });
    (useDeleteComment as jest.Mock).mockReturnValue({ mutate: deleteMutate });
    (useCreateAttachments as jest.Mock).mockReturnValue({ mutate: jest.fn(), isLoading: false });
  });

  it('asks before deleting an entry and deletes it on confirm', async () => {
    await openTableAndDelete();

    expect(screen.getByTestId('property-actions-confirm-modal')).toHaveTextContent(
      'Delete the timeline entry "User pasted ClickFix command"?'
    );
    expect(deleteMutate).not.toHaveBeenCalled();

    await userEvent.click(screen.getByTestId('confirmModalConfirmButton'));

    expect(deleteMutate).toHaveBeenCalledWith(
      expect.objectContaining({ caseId: basicCase.id, commentId: 'entry-1' })
    );
    expect(screen.queryByTestId('property-actions-confirm-modal')).not.toBeInTheDocument();
  });

  it('keeps the entry when the delete is cancelled', async () => {
    await openTableAndDelete();

    await userEvent.click(screen.getByTestId('confirmModalCancelButton'));

    expect(deleteMutate).not.toHaveBeenCalled();
    expect(screen.queryByTestId('property-actions-confirm-modal')).not.toBeInTheDocument();
  });
});
