/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@kbn/code-editor-mock/jest_helper';

import React from 'react';
import { omit } from 'lodash';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory } from 'history';
import { Route, Router } from '@kbn/shared-ux-router';

import { API_BASE_PATH } from '../../common/constants';
import { PipelinesEdit } from '../../public/application/sections/pipelines_edit';
import { getEditPath, ROUTES } from '../../public/application/services/navigation';
import { setupEnvironment, WithAppDependencies } from './helpers/setup_environment';

const PIPELINE_TO_EDIT = {
  name: 'my_pipeline',
  description: 'pipeline description',
  deprecated: true,
  processors: [
    {
      set: {
        field: 'foo',
        value: 'new',
      },
    },
  ],
};

const getInput = (testSubj: string) => {
  const el = screen.getByTestId(testSubj) as HTMLElement;
  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
    return el as HTMLInputElement | HTMLTextAreaElement;
  }
  return within(el).getByRole('textbox') as HTMLInputElement | HTMLTextAreaElement;
};

type TestHttpSetup = ReturnType<typeof setupEnvironment>['httpSetup'];

const renderPipelinesEdit = async (httpSetup: TestHttpSetup) => {
  const history = createMemoryHistory({
    initialEntries: [getEditPath({ pipelineName: PIPELINE_TO_EDIT.name })],
  });

  const Wrapped = WithAppDependencies(PipelinesEdit, httpSetup);
  render(
    <Router history={history}>
      <Route path={ROUTES.edit} component={Wrapped} />
    </Router>
  );

  await screen.findByTestId('pipelineForm');
};

// FLAKY: https://github.com/elastic/kibana/issues/253493
describe.skip('<PipelinesEdit />', () => {
  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();
  const originalLocation = window.location;

  beforeEach(() => {
    jest.clearAllMocks();
    httpRequestsMockHelpers.setLoadPipelineResponse(PIPELINE_TO_EDIT.name, PIPELINE_TO_EDIT);

    // Required by normalizePipelineNameFromParams() which uses window.location.pathname.
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        pathname: getEditPath({ pipelineName: PIPELINE_TO_EDIT.name }),
      },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  test('should render the correct page header', async () => {
    await renderPipelinesEdit(httpSetup);

    expect(screen.getByTestId('pageTitle')).toHaveTextContent(
      `Edit pipeline '${PIPELINE_TO_EDIT.name}'`
    );
    expect(screen.getByTestId('documentationLink')).toHaveTextContent('Edit pipeline docs');
  });

  test('should disable the name field', async () => {
    await renderPipelinesEdit(httpSetup);
    expect(getInput('nameField')).toBeDisabled();
  });

  test('should show deprecated callout', async () => {
    await renderPipelinesEdit(httpSetup);
    expect(screen.getByTestId('deprecatedPipelineCallout')).toBeInTheDocument();
  });

  test('should send the correct payload with changed values', async () => {
    const user = userEvent.setup();
    await renderPipelinesEdit(httpSetup);

    const UPDATED_DESCRIPTION = 'updated pipeline description';
    await user.clear(getInput('descriptionField'));
    await user.type(getInput('descriptionField'), UPDATED_DESCRIPTION);

    const putCallsBefore = httpSetup.put.mock.calls.length;
    fireEvent.click(screen.getByTestId('submitButton'));

    await waitFor(() => expect(httpSetup.put.mock.calls.length).toBeGreaterThan(putCallsBefore));
    const updateRequest = httpSetup.put.mock.results[putCallsBefore]?.value as
      | Promise<unknown>
      | undefined;
    expect(updateRequest).toBeDefined();
    await waitFor(async () => {
      await updateRequest;
    });

    const { name, ...pipelineDefinition } = PIPELINE_TO_EDIT;
    expect(httpSetup.put).toHaveBeenLastCalledWith(
      `${API_BASE_PATH}/${name}`,
      expect.objectContaining({
        body: JSON.stringify({
          ...omit(pipelineDefinition, 'deprecated'),
          description: UPDATED_DESCRIPTION,
        }),
      })
    );
  });
});
