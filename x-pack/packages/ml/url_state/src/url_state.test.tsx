/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, type FC } from 'react';
import { render, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { parseUrlState, useUrlState, UrlStateProvider } from './url_state';

const mockHistoryInitialState =
  "?_a=(mlExplorerFilter:(),mlExplorerSwimlane:(viewByFieldName:action),query:(query_string:(analyze_wildcard:!t,query:'*')))&_g=(ml:(jobIds:!(dec-2)),refreshInterval:(display:Off,pause:!f,value:0),time:(from:'2019-01-01T00:03:40.000Z',mode:absolute,to:'2019-08-30T11:55:07.000Z'))&savedSearchId=571aaf70-4c88-11e8-b3d7-01146121b73d";

describe('getUrlState', () => {
  test('properly decode url with _g and _a', () => {
    expect(parseUrlState(mockHistoryInitialState)).toEqual({
      _a: {
        mlExplorerFilter: {},
        mlExplorerSwimlane: {
          viewByFieldName: 'action',
        },
        query: {
          query_string: {
            analyze_wildcard: true,
            query: '*',
          },
        },
      },
      _g: {
        ml: {
          jobIds: ['dec-2'],
        },
        refreshInterval: {
          display: 'Off',
          pause: false,
          value: 0,
        },
        time: {
          from: '2019-01-01T00:03:40.000Z',
          mode: 'absolute',
          to: '2019-08-30T11:55:07.000Z',
        },
      },
      savedSearchId: '571aaf70-4c88-11e8-b3d7-01146121b73d',
    });
  });
});

describe('useUrlState', () => {
  it('pushes a properly encoded search string to history', () => {
    const TestComponent: FC = () => {
      const [appState, setAppState] = useUrlState('_a');

      useEffect(() => {
        setAppState(parseUrlState(mockHistoryInitialState)._a);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);

      return (
        <>
          <button onClick={() => setAppState({ query: 'my-query' })}>ButtonText</button>
          <div data-test-subj="appState">{JSON.stringify(appState?.query)}</div>
        </>
      );
    };

    const { getByText, getByTestId } = render(
      <MemoryRouter>
        <UrlStateProvider>
          <TestComponent />
        </UrlStateProvider>
      </MemoryRouter>
    );

    expect(getByTestId('appState').innerHTML).toBe(
      '{"query_string":{"analyze_wildcard":true,"query":"*"}}'
    );

    act(() => {
      getByText('ButtonText').click();
    });

    expect(getByTestId('appState').innerHTML).toBe('"my-query"');
  });

  it('updates both _g and _a state successfully', () => {
    const TestComponent: FC = () => {
      const [globalState, setGlobalState] = useUrlState('_g');
      const [appState, setAppState] = useUrlState('_a');

      useEffect(() => {
        setGlobalState({ time: 'initial time' });
        setAppState({ query: 'initial query' });
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);

      return (
        <>
          <button onClick={() => setGlobalState({ time: 'now-15m' })}>GlobalStateButton1</button>
          <button onClick={() => setGlobalState({ time: 'now-5y' })}>GlobalStateButton2</button>
          <button onClick={() => setAppState({ query: 'the updated query' })}>
            AppStateButton
          </button>
          <div data-test-subj="globalState">{globalState?.time}</div>
          <div data-test-subj="appState">{appState?.query}</div>
        </>
      );
    };

    const { getByText, getByTestId } = render(
      <MemoryRouter>
        <UrlStateProvider>
          <TestComponent />
        </UrlStateProvider>
      </MemoryRouter>
    );

    expect(getByTestId('globalState').innerHTML).toBe('initial time');
    expect(getByTestId('appState').innerHTML).toBe('initial query');

    act(() => {
      getByText('GlobalStateButton1').click();
    });

    expect(getByTestId('globalState').innerHTML).toBe('now-15m');
    expect(getByTestId('appState').innerHTML).toBe('initial query');

    act(() => {
      getByText('AppStateButton').click();
    });

    expect(getByTestId('globalState').innerHTML).toBe('now-15m');
    expect(getByTestId('appState').innerHTML).toBe('the updated query');

    act(() => {
      getByText('GlobalStateButton2').click();
    });

    expect(getByTestId('globalState').innerHTML).toBe('now-5y');
    expect(getByTestId('appState').innerHTML).toBe('the updated query');
  });
});
