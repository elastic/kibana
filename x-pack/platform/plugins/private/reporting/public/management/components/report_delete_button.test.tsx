/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import * as Rx from 'rxjs';
import {
  fireEvent,
  render,
  findByTestId as findItByTestId,
  findByText as findItByText,
} from '@testing-library/react';

import { mockJobs } from '../../../common/test';
import type { Job } from '@kbn/reporting-public/job';
import { ReportDeleteButton } from './report_delete_button';

describe('ReportDeleteButton', () => {
  it('renders prompt modal for single selected report', async () => {
    const deletePerformed$ = new Rx.Subject<void>();
    const performDelete = jest.fn().mockResolvedValue(Rx.firstValueFrom(deletePerformed$));
    const jobs = [mockJobs[0].payload] as Job[];

    const { findByTestId } = render(
      <ReportDeleteButton jobsToDelete={jobs} performDelete={performDelete} />
    );
    const getDeleteReportButton = () => findByTestId('deleteReportButton');

    expect(await getDeleteReportButton()).not.toBeDisabled();
    fireEvent.click(await getDeleteReportButton());
    expect(await getDeleteReportButton()).toBeDisabled();

    const modalElem = await findByTestId('deleteReportConfirm');
    expect(
      await findItByText(modalElem, 'Delete the "My Canvas Workpad" report?')
    ).toBeInTheDocument();
    const getConfirmButton = () => findItByTestId(modalElem, 'confirmModalConfirmButton');

    expect(await getConfirmButton()).not.toBeDisabled();
    fireEvent.click(await getConfirmButton());
    expect(await getConfirmButton()).toBeDisabled();

    deletePerformed$.next();

    expect(await getConfirmButton()).not.toBeDisabled();
  });

  it('renders prompt modal for multiple selected reports', async () => {
    const deletePerformed$ = new Rx.Subject<void>();
    const performDelete = jest.fn().mockResolvedValue(Rx.firstValueFrom(deletePerformed$));
    const jobs = [mockJobs[0].payload, mockJobs[1].payload] as Job[];

    const { findByTestId } = render(
      <ReportDeleteButton jobsToDelete={jobs} performDelete={performDelete} />
    );
    const getDeleteReportButton = () => findByTestId('deleteReportButton');

    expect(await getDeleteReportButton()).not.toBeDisabled();
    fireEvent.click(await getDeleteReportButton());
    expect(await getDeleteReportButton()).toBeDisabled();

    const modalElem = await findByTestId('deleteReportConfirm');
    expect(await findItByText(modalElem, 'Delete the 2 selected reports?')).toBeInTheDocument();
    const getConfirmButton = () => findItByTestId(modalElem, 'confirmModalConfirmButton');

    expect(await getConfirmButton()).not.toBeDisabled();
    fireEvent.click(await getConfirmButton());
    expect(await getConfirmButton()).toBeDisabled();

    deletePerformed$.next();

    expect(await getConfirmButton()).not.toBeDisabled();
  });
});
