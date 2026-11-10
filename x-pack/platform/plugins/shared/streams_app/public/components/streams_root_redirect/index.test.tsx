/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { useStreamsPrivileges } from '../../hooks/use_streams_privileges';
import { useShowClassicTab } from '../streams_layout/use_show_classic_tab';
import { StreamsRootRedirect } from '.';

jest.mock('../../hooks/use_streams_privileges');
jest.mock('../streams_layout/use_show_classic_tab', () => ({ useShowClassicTab: jest.fn() }));
jest.mock('../redirect_to', () => ({
  RedirectTo: ({
    path,
    params,
  }: {
    path: string;
    params: { path: { unitId: string; tab: string } };
  }) => (
    <div data-test-subj="redirectTo">
      {path.replace('{unitId}', params.path.unitId).replace('{tab}', params.path.tab)}
    </div>
  ),
}));
jest.mock('../stream_list_view', () => ({
  StreamListView: () => <div data-test-subj="streamListView" />,
}));
jest.mock('../streams_no_access_prompt', () => ({
  StreamsNoAccessPrompt: () => <div data-test-subj="streamsNoAccessPrompt" />,
}));

const mockAccess = (
  access: { legacy: boolean; v2: boolean },
  classicTab = { loading: false, showClassic: access.legacy }
) => {
  jest.mocked(useStreamsPrivileges).mockReturnValue({
    access,
  } as unknown as ReturnType<typeof useStreamsPrivileges>);
  jest.mocked(useShowClassicTab).mockReturnValue(classicTab);
};

describe('StreamsRootRedirect', () => {
  it('redirects a user with both experiences to the classic tab', () => {
    mockAccess({ legacy: true, v2: true });
    render(<StreamsRootRedirect />);

    expect(screen.getByTestId('redirectTo')).toHaveTextContent('/v2/unit/default/classic');
  });

  it('redirects a V2-only user to the map', () => {
    mockAccess({ legacy: false, v2: true });
    render(<StreamsRootRedirect />);

    expect(screen.getByTestId('redirectTo')).toHaveTextContent('/v2/unit/default/map');
  });

  it('waits for the stream check before redirecting', () => {
    mockAccess({ legacy: true, v2: true }, { loading: true, showClassic: true });
    render(<StreamsRootRedirect />);

    expect(screen.getByTestId('streamsDefaultTabLoading')).toBeInTheDocument();
    expect(screen.queryByTestId('redirectTo')).not.toBeInTheDocument();
  });

  it('shows the stream list for a legacy-only user', () => {
    mockAccess({ legacy: true, v2: false });
    render(<StreamsRootRedirect />);

    expect(screen.getByTestId('streamListView')).toBeInTheDocument();
  });

  it('shows the no-access prompt without either experience', () => {
    mockAccess({ legacy: false, v2: false });
    render(<StreamsRootRedirect />);

    expect(screen.getByTestId('streamsNoAccessPrompt')).toBeInTheDocument();
  });
});
