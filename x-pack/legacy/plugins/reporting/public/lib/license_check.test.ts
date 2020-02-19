/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getLinkState } from './license_check';
import { LICENSE_CHECK_STATE } from '../../../../../plugins/licensing/public';

describe('Reporting License Links', () => {
  it('returns true for Valid licenses', () => {
    expect(getLinkState(LICENSE_CHECK_STATE.Valid)).toEqual({
      showLinks: true,
      enableLinks: true,
    });
  });

  it('shows links, but disables them for expired licenses', () => {
    expect(getLinkState(LICENSE_CHECK_STATE.Expired)).toEqual({
      showLinks: true,
      enableLinks: false,
    });
  });

  it('hides links and disables them for invalid licenses', () => {
    expect(getLinkState(LICENSE_CHECK_STATE.Invalid)).toEqual({
      showLinks: false,
      enableLinks: false,
    });
  });

  it('shows links and disables them for unavailable licenses', () => {
    expect(getLinkState(LICENSE_CHECK_STATE.Unavailable)).toEqual({
      showLinks: true,
      enableLinks: false,
    });
  });

  it('hides and disables links for everything else', () => {
    expect(getLinkState('im-a-little-teapot' as any)).toEqual({
      showLinks: false,
      enableLinks: false,
    });
  });
});
