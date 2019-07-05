/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { injectObservablesAsProps } from '../../../util/observable_utils';
import mockAnnotations from '../annotations_table/__mocks__/mock_annotations.json';

import React, { ComponentType } from 'react';
import { mountWithIntl, shallowWithIntl } from 'test_utils/enzyme_helpers';

import { Annotation } from '../../../../common/types/annotations';
import { annotation$ } from '../../../services/annotations_service';

import { AnnotationFlyout } from './index';

describe('AnnotationFlyout', () => {
  test('Initialization.', () => {
    const wrapper = shallowWithIntl(<AnnotationFlyout />);
    expect(wrapper).toMatchSnapshot();
  });

  test('Update button is disabled with empty annotation', () => {
    const annotation = mockAnnotations[1] as Annotation;
    annotation$.next(annotation);

    // injectObservablesAsProps wraps the observable in a new component
    const ObservableComponent = injectObservablesAsProps(
      { annotation: annotation$ },
      (AnnotationFlyout as any) as ComponentType
    );

    const wrapper = mountWithIntl(<ObservableComponent />);
    const updateBtn = wrapper.find('EuiButton').first();
    expect(updateBtn.prop('isDisabled')).toEqual(true);
  });

  test('Error displayed and update button displayed if annotation text is longer than max chars', () => {
    const annotation = mockAnnotations[2] as Annotation;
    annotation$.next(annotation);

    // injectObservablesAsProps wraps the observable in a new component
    const ObservableComponent = injectObservablesAsProps(
      { annotation: annotation$ },
      (AnnotationFlyout as any) as ComponentType
    );

    const wrapper = mountWithIntl(<ObservableComponent />);
    const updateBtn = wrapper.find('EuiButton').first();
    expect(updateBtn.prop('isDisabled')).toEqual(true);

    expect(wrapper.find('EuiFormErrorText')).toHaveLength(1);
  });
});
