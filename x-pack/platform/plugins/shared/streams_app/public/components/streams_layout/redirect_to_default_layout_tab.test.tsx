/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { useStreamsAppParams } from '../../hooks/use_streams_app_params';
import { RedirectToDefaultLayoutTab } from './redirect_to_default_layout_tab';
import { useShowClassicTab } from './use_show_classic_tab';

jest.mock('../../hooks/use_streams_app_params', () => ({ useStreamsAppParams: jest.fn() }));
jest.mock('./use_show_classic_tab', () => ({ useShowClassicTab: jest.fn() }));
jest.mock('../redirect_to', () => ({
  RedirectTo: ({ params }: { params: { path: { unitId: string; tab: string } } }) => (
    <div data-test-subj="redirectTo">{`${params.path.unitId}/${params.path.tab}`}</div>
  ),
}));
jest.mock('../streams_app_page_template', () => ({
  StreamsAppPageTemplate: {
    EmptyPrompt: ({ 'data-test-subj': dataTestSubj }: { 'data-test-subj'?: string }) => (
      <div data-test-subj={dataTestSubj} />
    ),
  },
}));

const setup = ({
  unitId,
  loading = false,
  showClassic = false,
}: {
  unitId?: string;
  loading?: boolean;
  showClassic?: boolean;
}) => {
  jest
    .mocked(useStreamsAppParams)
    .mockReturnValue(
      (unitId ? { path: { unitId } } : undefined) as ReturnType<typeof useStreamsAppParams>
    );
  jest.mocked(useShowClassicTab).mockReturnValue({ loading, showClassic });
};

describe('RedirectToDefaultLayoutTab', () => {
  it('waits for the classic stream check', () => {
    setup({ loading: true });
    render(<RedirectToDefaultLayoutTab />);

    expect(screen.getByTestId('streamsClassicTabLoading')).toBeInTheDocument();
    expect(screen.queryByTestId('redirectTo')).not.toBeInTheDocument();
  });

  it('opens Classic on the current unit when a saved classic stream exists', () => {
    setup({ unitId: 'edge', showClassic: true });
    render(<RedirectToDefaultLayoutTab />);

    expect(screen.getByTestId('redirectTo')).toHaveTextContent('edge/classic');
  });

  it('opens the Map when no saved classic stream exists', () => {
    setup({ showClassic: false });
    render(<RedirectToDefaultLayoutTab />);

    expect(screen.getByTestId('redirectTo')).toHaveTextContent('default/map');
  });
});
