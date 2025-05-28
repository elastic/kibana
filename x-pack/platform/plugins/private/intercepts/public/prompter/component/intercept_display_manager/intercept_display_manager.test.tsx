/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import * as Rx from 'rxjs';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { InterceptDisplayManager, type Intercept } from './intercept_display_manager';

const staticAssetsHelperMock = httpServiceMock.createSetupContract().staticAssets;

const mockPerformanceMark = jest.fn(
  (name) =>
    ({
      name,
      startTime: 0,
      duration: 0,
      entryType: 'mark',
      detail: {},
      toJSON: () => ({}),
    } as PerformanceMark)
);

const mockPerformanceMeasure = jest.fn(
  (name) =>
    ({
      name,
      startTime: 0,
      duration: 0,
      entryType: 'measure',
      detail: {},
      toJSON: () => ({}),
    } as PerformanceMeasure)
);

describe('InterceptDisplayManager', () => {
  beforeAll(() => {
    window.performance.mark = mockPerformanceMark;
    window.performance.measure = mockPerformanceMeasure;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('does not render the dialog shell when there is no intercept to display', () => {
    const ackProductIntercept = jest.fn();

    render(
      <InterceptDisplayManager
        ackIntercept={ackProductIntercept}
        intercept$={Rx.EMPTY}
        staticAssetsHelper={staticAssetsHelperMock}
      />
    );

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders the dialog shell when there is an intercept to display', () => {
    const ackProductIntercept = jest.fn();

    const interceptStep: Intercept['steps'][number] = {
      id: 'hello',
      title: 'Hello World',
      content: () => <>{'This is a test'}</>,
    };

    const intercept$ = new Rx.BehaviorSubject<Intercept>({
      id: '1',
      runId: 1,
      steps: [
        { ...interceptStep, id: 'start' },
        interceptStep,
        { ...interceptStep, id: 'completion' },
      ],
      onFinish: jest.fn(),
    });

    render(
      <InterceptDisplayManager
        ackIntercept={ackProductIntercept}
        intercept$={intercept$.asObservable()}
        staticAssetsHelper={staticAssetsHelperMock}
      />
    );

    expect(screen.queryByRole('dialog')).not.toBeNull();
    expect(screen.getByTestId(`interceptStep-start`)).not.toBeNull();
    expect(screen.getByText('Hello World')).not.toBeNull();
    expect(screen.getByText('This is a test')).not.toBeNull();
  });

  it('closes the dialog and calls the provided ack function when the close button is clicked', async () => {
    const user = userEvent.setup();

    const ackProductIntercept = jest.fn();
    const interceptStep: Intercept['steps'][number] = {
      id: 'hello',
      title: 'Hello World',
      content: () => <>{'This is a test'}</>,
    };

    const intercept$ = new Rx.BehaviorSubject<Intercept>({
      id: '1',
      runId: 1,
      steps: [
        { ...interceptStep, id: 'start' },
        interceptStep,
        { ...interceptStep, id: 'completion' },
      ],
      onFinish: jest.fn(),
    });

    render(
      <InterceptDisplayManager
        ackIntercept={ackProductIntercept}
        intercept$={intercept$.asObservable()}
        staticAssetsHelper={staticAssetsHelperMock}
      />
    );

    expect(screen.queryByRole('dialog')).not.toBeNull();

    await user.click(screen.getByTestId('productInterceptDismiss'));

    expect(ackProductIntercept).toHaveBeenCalledWith({
      ackType: 'dismissed',
      interceptId: '1',
      runId: 1,
      interactionDuration: expect.any(Number),
    });

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('invokes the passed onProgress handler with the response the user provides as feedback', async () => {
    const user = userEvent.setup();

    const ackProductIntercept = jest.fn();

    const interceptStep: Intercept['steps'][number] = {
      id: 'hello',
      title: 'Hello World',
      content: () => <>{'This is a test'}</>,
    };

    const productIntercept: Intercept = {
      id: '1',
      runId: 1,
      steps: [
        { ...interceptStep, id: 'start' },
        {
          ...interceptStep,
          content: function InterceptContentTest({ onValue }) {
            return (
              <form
                data-test-subj="intercept-test-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  // @ts-expect-error -- the value we seek is defined, else our tests would fail
                  onValue((e.target as HTMLFormElement).elements.drone!.value);
                }}
              >
                <fieldset>
                  <legend>Select a maintenance drone:</legend>
                  <div>
                    <input type="radio" id="huey" name="drone" value="huey" defaultChecked />
                    <label htmlFor="huey">Huey</label>
                  </div>
                  <div>
                    <input type="radio" id="dewey" name="drone" value="dewey" />
                    <label htmlFor="dewey">Dewey</label>
                  </div>
                  <div>
                    <input type="radio" id="louie" name="drone" value="louie" />
                    <label htmlFor="louie">Louie</label>
                  </div>
                  <div>
                    <button type="submit">Submit</button>
                  </div>
                </fieldset>
              </form>
            );
          },
        },
        { ...interceptStep, id: 'completion' },
      ],
      onProgress: jest.fn(),
      onFinish: jest.fn(),
    };

    const intercept$ = new Rx.BehaviorSubject<Intercept>(productIntercept);

    render(
      <InterceptDisplayManager
        ackIntercept={ackProductIntercept}
        intercept$={intercept$.asObservable()}
        staticAssetsHelper={staticAssetsHelperMock}
      />
    );

    expect(screen.queryByRole('dialog')).not.toBeNull();

    // transition user to next step in intercept dialog
    await user.click(screen.getByTestId('productInterceptProgressionButton'));

    expect(screen.queryByTestId('intercept-test-form')).not.toBeNull();

    await user.click(screen.getByText('Louie'));

    await user.click(screen.getByText('Submit'));

    await waitFor(() =>
      expect(productIntercept.onProgress).toHaveBeenCalledWith({
        runId: 1,
        stepId: 'hello',
        stepResponse: 'louie',
      })
    );
  });
});
