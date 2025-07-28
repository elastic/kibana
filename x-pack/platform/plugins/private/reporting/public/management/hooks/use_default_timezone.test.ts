/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import 'moment-timezone';
import moment from 'moment';
import { useUiSetting } from '@kbn/kibana-react-plugin/public';
import { useDefaultTimezone } from './use_default_timezone';

jest.mock('@kbn/kibana-react-plugin/public');
const mockedUseUiSetting = jest.mocked(useUiSetting);

describe('useDefaultTimezone', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns browser timezone when kibanaTz is "Browser"', () => {
    mockedUseUiSetting.mockReturnValue('Browser');
    jest.spyOn(moment.tz, 'guess').mockReturnValue('Europe/Berlin');
    const result = useDefaultTimezone();
    expect(result).toEqual({ defaultTimezone: 'Europe/Berlin', isBrowser: true });
  });

  it('returns UTC when kibanaTz is falsy', () => {
    mockedUseUiSetting.mockReturnValue(undefined);
    // @ts-expect-error testing fallback to UTC
    jest.spyOn(moment.tz, 'guess').mockReturnValue(undefined);
    const result = useDefaultTimezone();
    expect(result).toEqual({ defaultTimezone: 'UTC', isBrowser: true });
  });

  it('returns kibanaTz when it is set', () => {
    mockedUseUiSetting.mockReturnValue('America/New_York');
    const result = useDefaultTimezone();
    expect(result).toEqual({ defaultTimezone: 'America/New_York', isBrowser: false });
  });
});
