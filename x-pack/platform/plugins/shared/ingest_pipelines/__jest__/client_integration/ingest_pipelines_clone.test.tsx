/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';

import { setupEnvironment, pageHelpers } from './helpers';
import { API_BASE_PATH } from '../../common/constants';
import type { PipelinesCloneTestBed } from './helpers/pipelines_clone.helpers';
import { PIPELINE_TO_CLONE } from './helpers/pipelines_clone.helpers';
import { getClonePath } from '../../public/application/services/navigation';

const { setup } = pageHelpers.pipelinesClone;

const originalLocation = window.location;
describe('<PipelinesClone />', () => {
  let testBed: PipelinesCloneTestBed;

  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();

  beforeEach(async () => {
    httpRequestsMockHelpers.setLoadPipelineResponse(PIPELINE_TO_CLONE.name, PIPELINE_TO_CLONE);

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        pathname: getClonePath({ clonedPipelineName: PIPELINE_TO_CLONE.name }),
      },
    });

    await act(async () => {
      testBed = await setup(httpSetup);
    });

    testBed.component.update();
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  test('should render the correct page header', () => {
    const { exists, find } = testBed;

    // Verify page title
    expect(exists('pageTitle')).toBe(true);
    expect(find('pageTitle').text()).toEqual('Create pipeline');

    // Verify documentation link
    expect(exists('documentationLink')).toBe(true);
    expect(find('documentationLink').text()).toBe('Create pipeline docs');
  });

  describe('form submission', () => {
    it('should send the correct payload', async () => {
      const { actions } = testBed;

      await actions.clickSubmitButton();

      expect(httpSetup.post).toHaveBeenLastCalledWith(
        API_BASE_PATH,
        expect.objectContaining({
          body: JSON.stringify({
            ...PIPELINE_TO_CLONE,
            name: `${PIPELINE_TO_CLONE.name}-copy`,
          }),
        })
      );
    });
  });
});
