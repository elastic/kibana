/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { useStreamsAppParams } from '../../hooks/use_streams_app_params';
import { useStreamsPrivileges } from '../../hooks/use_streams_privileges';
import { RedirectToDefaultLayoutTab } from './redirect_to_default_layout_tab';

jest.mock('../../hooks/use_streams_app_params', () => ({ useStreamsAppParams: jest.fn() }));
jest.mock('../../hooks/use_streams_privileges', () => ({ useStreamsPrivileges: jest.fn() }));
jest.mock('../redirect_to', () => ({
  RedirectTo: ({ params }: { params: { path: { unitId: string; tab: string } } }) => (
    <div data-test-subj="redirectTo">{`${params.path.unitId}/${params.path.tab}`}</div>
  ),
}));

const setup = ({ unitId, legacy }: { unitId?: string; legacy: boolean }) => {
  jest
    .mocked(useStreamsAppParams)
    .mockReturnValue(
      (unitId ? { path: { unitId } } : undefined) as ReturnType<typeof useStreamsAppParams>
    );
  jest.mocked(useStreamsPrivileges).mockReturnValue({
    access: { v2: true, legacy },
  } as unknown as ReturnType<typeof useStreamsPrivileges>);
};

describe('RedirectToDefaultLayoutTab', () => {
  it('opens Classic on the current unit with Streams access', () => {
    setup({ unitId: 'edge', legacy: true });
    render(<RedirectToDefaultLayoutTab />);

    expect(screen.getByTestId('redirectTo')).toHaveTextContent('edge/classic');
  });

  it('opens the Map on the default unit without Streams access', () => {
    setup({ legacy: false });
    render(<RedirectToDefaultLayoutTab />);

    expect(screen.getByTestId('redirectTo')).toHaveTextContent('default/map');
  });
});
