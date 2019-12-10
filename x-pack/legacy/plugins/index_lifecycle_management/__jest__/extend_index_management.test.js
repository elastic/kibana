/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mountWithIntl } from '../../../../test_utils/enzyme_helpers';
import moment from 'moment-timezone';
import {
  retryLifecycleActionExtension,
  removeLifecyclePolicyActionExtension,
  addLifecyclePolicyActionExtension,
  ilmBannerExtension,
  ilmFilterExtension,
  ilmSummaryExtension,
} from '../public/extend_index_management';

jest.mock('ui/new_platform');
const indexWithoutLifecyclePolicy = {
  health: 'yellow',
  status: 'open',
  name: 'noPolicy',
  uuid: 'BJ-nrZYuSrG-jaofr6SeLg',
  primary: '1',
  replica: '1',
  documents: '1',
  documents_deleted: '0',
  size: '3.4kb',
  primary_size: '3.4kb',
  aliases: 'none',
  ilm: {
    index: 'testy1',
    managed: false,
  },
};
const indexWithLifecyclePolicy = {
  health: 'yellow',
  status: 'open',
  name: 'testy3',
  uuid: 'XL11TLa3Tvq298_dMUzLHQ',
  primary: '1',
  replica: '1',
  documents: '2',
  documents_deleted: '0',
  size: '6.5kb',
  primary_size: '6.5kb',
  aliases: 'none',
  ilm: {
    index: 'testy3',
    managed: true,
    policy: 'testy',
    lifecycle_date_millis: 1544020872361,
    phase: 'new',
    phase_time_millis: 1544187775867,
    action: 'complete',
    action_time_millis: 1544187775867,
    step: 'complete',
    step_time_millis: 1544187775867,
  },
};
const indexWithLifecycleError = {
  health: 'yellow',
  status: 'open',
  name: 'testy3',
  uuid: 'XL11TLa3Tvq298_dMUzLHQ',
  primary: '1',
  replica: '1',
  documents: '2',
  documents_deleted: '0',
  size: '6.5kb',
  primary_size: '6.5kb',
  aliases: 'none',
  ilm: {
    index: 'testy3',
    managed: true,
    policy: 'testy',
    lifecycle_date_millis: 1544020872361,
    phase: 'hot',
    phase_time_millis: 1544187775891,
    action: 'rollover',
    action_time_millis: 1544187775891,
    step: 'ERROR',
    step_time_millis: 1544187776208,
    failed_step: 'check-rollover-ready',
    step_info: {
      type: 'illegal_argument_exception',
      reason: 'setting [index.lifecycle.rollover_alias] for index [testy3] is empty or not defined',
      stack_trace: 'fakestacktrace'
    },
    phase_execution: {
      policy: 'testy',
      phase_definition: { min_age: '0s', actions: { rollover: { max_size: '1gb' } } },
      version: 1,
      modified_date_in_millis: 1544031699844,
    },
  },
};
moment.tz.setDefault('utc');
describe('retry lifecycle action extension', () => {
  test('should return null when no indices have index lifecycle policy', () => {
    const extension = retryLifecycleActionExtension([indexWithoutLifecyclePolicy]);
    expect(extension).toBeNull();
  });
  test('should return null when no index has lifecycle errors', () => {
    const extension = retryLifecycleActionExtension([
      indexWithLifecyclePolicy,
      indexWithLifecyclePolicy,
    ]);
    expect(extension).toBeNull();
  });
  test('should return null when not all indices have lifecycle errors', () => {
    const extension = retryLifecycleActionExtension([
      indexWithLifecyclePolicy,
      indexWithLifecycleError,
    ]);
    expect(extension).toBeNull();
  });
  test('should return extension when all indices have lifecycle errors', () => {
    const extension = retryLifecycleActionExtension([
      indexWithLifecycleError,
      indexWithLifecycleError,
    ]);
    expect(extension).toBeDefined();
    expect(extension).toMatchSnapshot();
  });
});
describe('remove lifecycle action extension', () => {
  test('should return null when no indices have index lifecycle policy', () => {
    const extension = removeLifecyclePolicyActionExtension([indexWithoutLifecyclePolicy]);
    expect(extension).toBeNull();
  });
  test('should return null when some indices have index lifecycle policy', () => {
    const extension = removeLifecyclePolicyActionExtension([
      indexWithoutLifecyclePolicy,
      indexWithLifecyclePolicy
    ]);
    expect(extension).toBeNull();
  });
  test('should return extension when all indices have lifecycle policy', () => {
    const extension = removeLifecyclePolicyActionExtension([
      indexWithLifecycleError,
      indexWithLifecycleError,
    ]);
    expect(extension).toBeDefined();
    expect(extension).toMatchSnapshot();
  });
});
describe('add lifecycle policy action extension', () => {
  test('should return null when index has index lifecycle policy', () => {
    const extension = addLifecyclePolicyActionExtension([indexWithLifecyclePolicy]);
    expect(extension).toBeNull();
  });
  test('should return null when more than one index is passed', () => {
    const extension = addLifecyclePolicyActionExtension([
      indexWithoutLifecyclePolicy,
      indexWithoutLifecyclePolicy,
    ]);
    expect(extension).toBeNull();
  });
  test('should return extension when one index is passed and it does not have lifecycle policy', () => {
    const extension = addLifecyclePolicyActionExtension([indexWithoutLifecyclePolicy]);
    expect(extension.renderConfirmModal).toBeDefined;
    const component = extension.renderConfirmModal(jest.fn());
    const rendered = mountWithIntl(component);
    expect(rendered.exists('.euiModal--confirmation'));
  });
});
describe('ilm banner extension', () => {
  test('should return null when no index has index lifecycle policy', () => {
    const extension = ilmBannerExtension([
      indexWithoutLifecyclePolicy,
      indexWithoutLifecyclePolicy,
    ]);
    expect(extension).toBeNull();
  });
  test('should return null no index has lifecycle error', () => {
    const extension = ilmBannerExtension([
      indexWithoutLifecyclePolicy,
      indexWithLifecyclePolicy,
    ]);
    expect(extension).toBeNull();
  });
  test('should return extension when any index has lifecycle error', () => {
    const extension = ilmBannerExtension([
      indexWithoutLifecyclePolicy,
      indexWithLifecyclePolicy,
      indexWithLifecycleError,
    ]);
    expect(extension).toBeDefined();
    expect(extension).toMatchSnapshot();
  });
});
describe('ilm summary extension', () => {
  test('should render null when index has no index lifecycle policy', () => {
    const extension = ilmSummaryExtension(indexWithoutLifecyclePolicy);
    const rendered = mountWithIntl(extension);
    expect(rendered.isEmptyRender()).toBeTruthy();
  });
  test('should return extension when index has lifecycle policy', () => {
    const extension = ilmSummaryExtension(indexWithLifecyclePolicy);
    expect(extension).toBeDefined();
    const rendered = mountWithIntl(extension);
    expect(rendered).toMatchSnapshot();
  });
  test('should return extension when index has lifecycle error', () => {
    const extension = ilmSummaryExtension(indexWithLifecycleError);
    expect(extension).toBeDefined();
    const rendered = mountWithIntl(extension);
    expect(rendered).toMatchSnapshot();
  });
});
describe('ilm filter extension', () => {
  test('should return empty array when no indices have index lifecycle policy', () => {
    const extension = ilmFilterExtension([
      indexWithoutLifecyclePolicy,
      indexWithoutLifecyclePolicy,
    ]);
    expect(extension.length).toBe(0);
  });
  test('should return extension when any index has lifecycle policy', () => {
    const extension = ilmFilterExtension([
      indexWithLifecyclePolicy,
      indexWithoutLifecyclePolicy,
      indexWithoutLifecyclePolicy,
    ]);
    expect(extension).toBeDefined();
    expect(extension).toMatchSnapshot();
  });
});
