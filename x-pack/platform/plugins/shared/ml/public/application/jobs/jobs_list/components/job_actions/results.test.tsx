/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { MlSummaryJob } from '@kbn/ml-common-types/anomaly_detection_jobs/summary_job';

import { ResultLinks } from './results';

jest.mock('../../../../components/custom_hooks/use_create_ad_links', () => ({
  useCreateADLinks: () => ({
    createLinkWithUserDefaults: (location: string) => `/app/ml/${location}`,
  }),
}));

const createJob = (overrides: Partial<MlSummaryJob> = {}): MlSummaryJob =>
  ({
    id: 'job-1',
    isSingleMetricViewerJob: true,
    ...overrides,
  } as MlSummaryJob);

describe('ResultLinks', () => {
  it('does not repeat the Single Metric Viewer link name as a tooltip description', async () => {
    render(<ResultLinks jobs={[createJob()]} />);

    const link = screen.getByTestId('mlOpenJobsInSingleMetricViewerButton');
    fireEvent.mouseOver(link);
    await screen.findByRole('tooltip');

    expect(link).toHaveAccessibleName('Open job-1 in Single Metric Viewer');
    expect(link).not.toHaveAttribute('aria-describedby');
  });

  it('does not repeat the Anomaly Explorer link name as a tooltip description', async () => {
    render(<ResultLinks jobs={[createJob()]} />);

    const link = screen.getByTestId('mlOpenJobsInAnomalyExplorerButton');
    fireEvent.mouseOver(link);
    await screen.findByRole('tooltip');

    expect(link).toHaveAccessibleName('Open job-1 in Anomaly Explorer');
    expect(link).not.toHaveAttribute('aria-describedby');
  });

  it('describes a disabled Single Metric Viewer link with the reason', async () => {
    render(
      <ResultLinks
        jobs={[
          createJob({
            isSingleMetricViewerJob: false,
            isNotSingleMetricViewerJobMessage: 'only one detector is supported',
          }),
        ]}
      />
    );

    fireEvent.mouseOver(screen.getByTestId('mlOpenJobsInSingleMetricViewerButton'));

    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Disabled because only one detector is supported.'
    );
  });
});
