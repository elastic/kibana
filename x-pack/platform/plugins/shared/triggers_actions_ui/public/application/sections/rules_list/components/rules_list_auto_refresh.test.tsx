/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import moment from 'moment';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { act } from 'react-dom/test-utils';
import { RulesListAutoRefresh } from './rules_list_auto_refresh';

const onRefresh = jest.fn();

describe('RulesListAutoRefresh', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the update text correctly', async () => {
    jest.useFakeTimers().setSystemTime(moment('1990-01-01').toDate());

    const wrapper = mountWithIntl(
      <RulesListAutoRefresh lastUpdate={moment('1990-01-01').format()} onRefresh={onRefresh} />
    );

    expect(
      wrapper.find('[data-test-subj="rulesListAutoRefresh-lastUpdateText"]').first().text()
    ).toEqual('Updated a few seconds ago');

    await act(async () => {
      jest.advanceTimersByTime(1 * 60 * 1000);
    });

    expect(
      wrapper.find('[data-test-subj="rulesListAutoRefresh-lastUpdateText"]').first().text()
    ).toEqual('Updated a minute ago');

    await act(async () => {
      jest.advanceTimersByTime(1 * 60 * 1000);
    });

    expect(
      wrapper.find('[data-test-subj="rulesListAutoRefresh-lastUpdateText"]').first().text()
    ).toEqual('Updated 2 minutes ago');

    await act(async () => {
      jest.runOnlyPendingTimers();
    });
  });

  it('calls onRefresh when it auto refreshes', async () => {
    jest.useFakeTimers().setSystemTime(moment('1990-01-01').toDate());

    mountWithIntl(
      <RulesListAutoRefresh
        lastUpdate={moment('1990-01-01').format()}
        initialUpdateInterval={1000}
        onRefresh={onRefresh}
      />
    );

    expect(onRefresh).toHaveBeenCalledTimes(0);

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    expect(onRefresh).toHaveBeenCalledTimes(2);

    await act(async () => {
      jest.advanceTimersByTime(10 * 1000);
    });

    expect(onRefresh).toHaveBeenCalledTimes(12);

    await act(async () => {
      jest.runOnlyPendingTimers();
    });
  });
});
