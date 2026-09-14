/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallowWithIntl } from '@kbn/test-jest-helpers';
import { PipelineList } from './pipeline_list';
import { PipelineAppHeader, createPipelineButtonLabel } from '../pipeline_app_header';

describe('PipelineList component', () => {
  let props;
  let addDanger;
  let addSuccess;
  let addWarning;

  let pipelines;

  const getGetPipelineList = (isSuccess, result) =>
    isSuccess ? () => Promise.resolve(result) : () => Promise.reject(result);

  const getIsClusterInfoAvailable = (isAvailable) => () => Promise.resolve(isAvailable);

  const getDeleteSelectedPipelines = (isSuccess) =>
    isSuccess ? () => Promise.resolve({}) : () => Promise.reject({});

  beforeEach(() => {
    pipelines = [{ id: 'test', description: 'test description' }];
    addDanger = jest.fn();
    addSuccess = jest.fn();
    addWarning = jest.fn();
    props = {
      clusterService: {
        isClusterInfoAvailable: getIsClusterInfoAvailable(true),
        deleteSelectedPipelines: getDeleteSelectedPipelines(true),
      },
      history: {
        createHref: ({ pathname }) => pathname,
        push: jest.fn(),
      },
      createPipeline: jest.fn(),
      isServerless: false,
      isReadOnly: false,
      licenseService: {
        checkValidity: () => Promise.resolve(),
        message: 'the license service message',
      },
      monitoringService: {
        isMonitoringEnabled: () => true,
      },
      pipelinesService: {
        getPipelineList: getGetPipelineList(true, pipelines),
      },
      toastNotifications: {
        addDanger,
        addSuccess,
        addWarning,
      },
    };
  });

  async function renderWithProps() {
    const wrapper = shallowWithIntl(<PipelineList.WrappedComponent {...props} />);
    await Promise.all([wrapper.instance().componentDidMount]);
    return wrapper;
  }

  it('notifies the user if readonly after pipeline load', async () => {
    props.isReadOnly = true;
    await renderWithProps();
    expect(addWarning).toHaveBeenCalledWith('the license service message');
  });

  it('does not notify if not readonly', async () => {
    await renderWithProps();
    expect(addWarning).not.toHaveBeenCalled();
  });

  it('renders empty prompt for no pipelines', async () => {
    props.pipelinesService.getPipelineList = getGetPipelineList(true, []);
    const wrapper = await renderWithProps();
    const component = wrapper.instance();
    expect(component.state.message).toEqual(component.getEmptyPrompt());
  });

  it('notifies the user if pipeline load fails', async () => {
    props.pipelinesService.getPipelineList = getGetPipelineList(false, {
      status: 401,
      statusText: 'Unauthorized access',
    });
    props.isReadOnly = false;
    await renderWithProps();
    expect(addDanger).toHaveBeenCalledWith(`Couldn't load pipeline. Error: "Unauthorized access".`);
  });

  it('sets state to forbidden if 403 error and not readonly', async () => {
    props.pipelinesService.getPipelineList = getGetPipelineList(false, {
      status: 403,
    });
    props.isReadOnly = false;
    const wrapper = await renderWithProps();
    const component = wrapper.instance();
    expect(component.state.isLoading).toBe(false);
    expect(component.state.isForbidden).toBe(true);
  });

  it('is not forbidden if 403 and readonly is true', async () => {
    props.pipelinesService.getPipelineList = getGetPipelineList(false, {
      status: 403,
    });
    props.isReadOnly = true;
    const wrapper = await renderWithProps();
    const component = wrapper.instance();
    expect(component.state.isLoading).toBe(false);
    expect(component.state.isForbidden).toBe(false);
  });

  describe('create pipeline header action', () => {
    const getCreateAction = (wrapper) =>
      wrapper.find(PipelineAppHeader).prop('menu')?.primaryActionItem;

    it('renders create pipeline in the header after pipelines load', async () => {
      const wrapper = await renderWithProps();
      wrapper.setState({ isLoading: false, isForbidden: false, pipelines });

      const createAction = getCreateAction(wrapper);
      expect(createAction).toEqual(
        expect.objectContaining({
          id: 'createPipeline',
          label: createPipelineButtonLabel,
          testId: 'btnAdd',
          href: '/pipeline/new-pipeline',
          disableButton: false,
        })
      );

      createAction.run();
      expect(props.createPipeline).toHaveBeenCalledTimes(1);
    });

    it('disables the header create pipeline action when read only', async () => {
      props.isReadOnly = true;
      const wrapper = await renderWithProps();
      wrapper.setState({ isLoading: false, isForbidden: false, pipelines });

      expect(getCreateAction(wrapper).disableButton).toBe(true);
    });

    it('does not put create pipeline in the header while loading', () => {
      const wrapper = shallowWithIntl(<PipelineList.WrappedComponent {...props} />);
      wrapper.setState({ isLoading: true, pipelines: [] });

      expect(getCreateAction(wrapper)).toBeUndefined();
    });

    it('does not put create pipeline in the header when the list is empty', async () => {
      props.pipelinesService.getPipelineList = getGetPipelineList(true, []);
      const wrapper = await renderWithProps();
      wrapper.setState({ isLoading: false, isForbidden: false, pipelines: [] });

      expect(getCreateAction(wrapper)).toBeUndefined();
    });

    it('does not put create pipeline in the header when access is forbidden', async () => {
      const wrapper = await renderWithProps();
      wrapper.setState({ isLoading: false, isForbidden: true, pipelines });

      expect(getCreateAction(wrapper)).toBeUndefined();
    });
  });
});
