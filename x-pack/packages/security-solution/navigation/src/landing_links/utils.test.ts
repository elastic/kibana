/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getKibanaLinkProps } from './utils';
import * as links from '../links';

describe('getWrappedLinkProps', () => {
  let isSecurityIdSpy: jest.SpyInstance;

  beforeEach(() => {
    // Create a spy on the isSecurityId function before each test
    isSecurityIdSpy = jest.spyOn(links, 'isSecurityId');
  });

  afterEach(() => {
    isSecurityIdSpy.mockRestore();
  });

  it('returns the correct WrappedLinkProps when id is not external and skipUrlState is false', () => {
    const id = 'internal-id';
    const urlState = 'example-url-state';
    const onLinkClick = jest.fn();

    const result = getKibanaLinkProps({
      id,
      skipUrlState: false,
      urlState,
      onLinkClick,
    });

    expect(result).toEqual({
      id,
      urlState,
      onClick: expect.any(Function),
    });

    expect(isSecurityIdSpy).toHaveBeenCalledWith(id);
    expect(onLinkClick).not.toHaveBeenCalled();

    result.onClick?.({} as unknown as React.MouseEvent<HTMLAnchorElement>);
    expect(onLinkClick).toHaveBeenCalledWith(id);
  });

  it('returns the correct WrappedLinkProps when id is external', () => {
    const id = 'external:id';
    const result = getKibanaLinkProps({ id });

    expect(result).toEqual({ id });
    expect(isSecurityIdSpy).toHaveBeenCalledWith(id);
  });

  it('returns the correct WrappedLinkProps when skipUrlState is true', () => {
    const id = 'internal-id';
    const result = getKibanaLinkProps({ id, skipUrlState: true });

    expect(result).toEqual({ id });
    expect(isSecurityIdSpy).toHaveBeenCalledWith(id);
  });
});
