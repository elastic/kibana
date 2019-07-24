/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import 'brace';
import { PipelineEditor } from './pipeline_editor';

describe('PipelineEditor component', () => {
  let props;
  let close;
  let isNewPipeline;
  let licenseService;
  let open;
  let pipeline;
  let pipelineService;
  let routeService;
  let toastNotifications;
  let username;

  beforeEach(() => {
    close = jest.fn();
    isNewPipeline = false;
    licenseService = {
      checkValidity: jest.fn(),
      isReadOnly: false,
      message: 'license service message',
    };
    open = jest.fn();
    pipeline = {
      id: 'pipelineId',
      description: 'pipeline description',
      pipeline: 'input { stdin { } } filter { } output { stdout { } }',
      settings: {
        'pipeline.batch.delay': 10,
        'pipeline.batch.size': 256,
        'pipeline.workers': 1,
        'queue.checkpoint.writes': 100,
        'queue.max_bytes': 1024,
        'queue.type': 'MB',
      },
    };
    pipelineService = {
      deletePipeline: jest.fn(),
      savePipeline: jest.fn(),
    };
    routeService = {
      current: {
        params: {
          clone: undefined,
          id: undefined,
        },
      },
    };
    toastNotifications = {
      addWarning: jest.fn(),
      addSuccess: jest.fn(),
      addError: jest.fn(),
    };
    username = 'elastic';
    props = {
      close,
      isNewPipeline,
      licenseService,
      open,
      pipeline,
      pipelineService,
      routeService,
      toastNotifications,
      username,
    };
  });

  it('matches snapshot for edit pipeline', () => {
    expect(shallowWithIntl(<PipelineEditor.WrappedComponent {...props} />)).toMatchSnapshot();
  });

  it('matches snapshot for clone pipeline', () => {
    routeService.current.params = {
      clone: true,
      id: 'pipelineToClone',
    };
    expect(shallowWithIntl(<PipelineEditor.WrappedComponent {...props} />)).toMatchSnapshot();
  });

  it('matches snapshot for create pipeline', () => {
    expect(shallowWithIntl(<PipelineEditor.WrappedComponent {...props} isNewPipeline={true} />)).toMatchSnapshot();
  });

  it('updates state for pipeline id when creating', () => {
    const wrapper = shallowWithIntl(<PipelineEditor.WrappedComponent {...props} isNewPipeline={true} />);
    wrapper.find(`[data-test-subj="inputId"]`).simulate('change', { target: { value: 'theNewPipelineId' } });
    expect(wrapper.instance().state.pipeline.id).toBe('theNewPipelineId');
  });

  it('updates pipeline description', () => {
    const wrapper = shallowWithIntl(<PipelineEditor.WrappedComponent {...props} isNewPipeline={true} />);
    wrapper.find(`[data-test-subj="inputDescription"]`).simulate('change', { target: { value: 'the new description' } });
    expect(wrapper.instance().state.pipeline.description).toBe('the new description');
  });

  it('updates pipeline workers', () => {
    const wrapper = shallowWithIntl(<PipelineEditor.WrappedComponent {...props} />);
    wrapper.find(`[data-test-subj="inputWorkers"]`).simulate('change', { target: { value: '12' } });
    expect(wrapper.instance().state.pipeline.settings['pipeline.workers']).toBe(12);
  });

  it('updates pipeline batch size', () => {
    const wrapper = shallowWithIntl(<PipelineEditor.WrappedComponent {...props} />);
    wrapper.find(`[data-test-subj="inputBatchSize"]`).simulate('change', { target: { value: '12' } });
    expect(wrapper.instance().state.pipeline.settings['pipeline.batch.size']).toBe(12);
  });

  it('updates pipeline settings', () => {
    const wrapper = shallowWithIntl(<PipelineEditor.WrappedComponent {...props} />);
    wrapper.find(`[data-test-subj="inputWorkers"]`).simulate('change', { target: { value: '10' } });
    wrapper.find(`[data-test-subj="inputBatchSize"]`).simulate('change', { target: { value: '11' } });
    wrapper.find(`[data-test-subj="inputBatchDelay"]`).simulate('change', { target: { value: '12' } });
    wrapper.find(`[data-test-subj="inputQueueMaxBytesNumber"]`).simulate('change', { target: { value: '13' } });
    wrapper.find(`[data-test-subj="inputQueueCheckpointWrites"]`).simulate('change', { target: { value: '14' } });
    expect(wrapper.instance().state.pipeline.settings['pipeline.workers']).toBe(10);
    expect(wrapper.instance().state.pipeline.settings['pipeline.batch.size']).toBe(11);
    expect(wrapper.instance().state.pipeline.settings['pipeline.batch.delay']).toBe(12);
    expect(wrapper.instance().state.pipeline.settings['queue.checkpoint.writes']).toBe(14);
  });

  it('calls the pipelineService delete function on delete', () => {
    const wrapper = shallowWithIntl(<PipelineEditor.WrappedComponent {...props} />);
    wrapper.find(`[data-test-subj="btnDeletePipeline"]`).simulate('click');
    expect(wrapper.instance().state.showConfirmDeleteModal).toBe(true);
  });

  it('only matches pipeline names that fit the acceptable parameters', () => {
    const wrapper = shallowWithIntl(<PipelineEditor.WrappedComponent {...props} />);
    const pattern = wrapper.instance().state.pipelineIdPattern;

    expect(pattern.test('_startwithunderscore')).toBe(true);
    expect(pattern.test('startwithloweralpha')).toBe(true);
    expect(pattern.test('Startwithupperalpha')).toBe(true);
    expect(pattern.test('_us-with-dashes')).toBe(true);
    expect(pattern.test('_us-With-UPPER-alpha')).toBe(true);
    expect(pattern.test('contains a space')).toBe(false);
    expect(pattern.test('8startswithnum')).toBe(false);
    expect(pattern.test(' startswithspace')).toBe(false);
    expect(pattern.test('endswithspace ')).toBe(false);
    expect(pattern.test('a?')).toBe(false);
    expect(pattern.test('?')).toBe(false);
    expect(pattern.test('+')).toBe(false);
    expect(pattern.test('f+')).toBe(false);
  });

  it('invalidates form for invalid pipeline id input', () => {
    const wrapper = shallowWithIntl(<PipelineEditor.WrappedComponent {...props} isNewPipeline={true} />);
    wrapper.find(`[data-test-subj="inputId"]`).simulate('change', { target: { value: '$invalid-pipeline-name' } });
    expect(wrapper).toMatchSnapshot();
  });

  it('invalidates form for pipeline id with spaces', () => {
    const wrapper = shallowWithIntl(<PipelineEditor.WrappedComponent {...props} isNewPipeline={true} />);
    wrapper.find(`[data-test-subj="inputId"]`).simulate('change', { target: { value: 'pipeline id with spaces' } });
    expect(wrapper).toMatchSnapshot();
  });

  it('includes required error message for falsy pipeline id', () => {
    const wrapper = shallowWithIntl(<PipelineEditor.WrappedComponent {...props} isNewPipeline={true} />);
    wrapper.find(`[data-test-subj="inputId"]`).simulate('change', { target: { value: '' } });
    expect(wrapper).toMatchSnapshot();
  });
});
