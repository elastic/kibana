/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useObservable } from 'react-use';

import mockAnnotations from '../annotations_table/__mocks__/mock_annotations.json';

import React from 'react';
import { mountWithIntl, shallowWithIntl } from 'test_utils/enzyme_helpers';

import { Annotation } from '../../../../../common/types/annotations';
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

    // useObservable wraps the observable in a new component
    const ObservableComponent = (props: any) => {
      const annotationProp = useObservable(annotation$);
      if (annotationProp === undefined) {
        return null;
      }
      return <AnnotationFlyout annotation={annotationProp} {...props} />;
    };

    const wrapper = mountWithIntl(<ObservableComponent />);
    const updateBtn = wrapper.find('EuiButton').first();
    expect(updateBtn.prop('isDisabled')).toEqual(true);
  });

  test('Error displayed and update button displayed if annotation text is longer than max chars', () => {
    const annotation = mockAnnotations[2] as Annotation;
    annotation$.next(annotation);

    // useObservable wraps the observable in a new component
    const ObservableComponent = (props: any) => {
      const annotationProp = useObservable(annotation$);
      if (annotationProp === undefined) {
        return null;
      }
      return <AnnotationFlyout annotation={annotationProp} {...props} />;
    };

    const wrapper = mountWithIntl(<ObservableComponent />);
    const updateBtn = wrapper.find('EuiButton').first();
    expect(updateBtn.prop('isDisabled')).toEqual(true);

    expect(wrapper.find('EuiFormErrorText')).toHaveLength(1);
  });
});
