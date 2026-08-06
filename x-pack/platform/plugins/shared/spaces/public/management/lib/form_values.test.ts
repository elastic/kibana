/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { haveFormValuesChanged } from './form_values';
import { getSpaceColor, getSpaceInitials } from '../../space_avatar';
import type { CustomizeSpaceFormValues } from '../types';

const initialValues: CustomizeSpaceFormValues = {
  id: 'my-space',
  name: 'My space',
  disabledFeatures: [],
  avatarType: 'initials',
};

describe('haveFormValuesChanged', () => {
  it('reports no changes for an untouched form', () => {
    expect(haveFormValuesChanged(initialValues, { ...initialValues })).toBe(false);
  });

  it('reports changes when a value is edited', () => {
    expect(haveFormValuesChanged(initialValues, { ...initialValues, name: 'Another name' })).toBe(
      true
    );
    expect(
      haveFormValuesChanged(initialValues, { ...initialValues, disabledFeatures: ['feature-1'] })
    ).toBe(true);
    expect(haveFormValuesChanged(initialValues, { ...initialValues, solution: 'oblt' })).toBe(true);
  });

  it('reports no changes when the derived initials and color are filled in', () => {
    // the form hands these back to us as the user interacts with it, even when they are untouched
    expect(
      haveFormValuesChanged(initialValues, {
        ...initialValues,
        initials: getSpaceInitials(initialValues),
        color: getSpaceColor(initialValues),
      })
    ).toBe(false);
  });

  it('reports changes when the initials or color are customized', () => {
    expect(haveFormValuesChanged(initialValues, { ...initialValues, initials: 'ZZ' })).toBe(true);
    expect(haveFormValuesChanged(initialValues, { ...initialValues, color: '#000000' })).toBe(true);
  });

  it('reports no changes when a cleared field was empty to begin with', () => {
    expect(haveFormValuesChanged(initialValues, { ...initialValues, description: '' })).toBe(false);
    expect(haveFormValuesChanged(initialValues, { ...initialValues, imageUrl: '' })).toBe(false);
    expect(
      haveFormValuesChanged(initialValues, { ...initialValues, customIdentifier: false })
    ).toBe(false);
  });

  it('reports changes when a populated field is cleared', () => {
    expect(haveFormValuesChanged({ ...initialValues, description: 'A space' }, initialValues)).toBe(
      true
    );
  });

  it('reports no changes once an edit is reverted', () => {
    const edited = { ...initialValues, disabledFeatures: ['feature-1'] };
    expect(haveFormValuesChanged(initialValues, edited)).toBe(true);
    expect(haveFormValuesChanged(initialValues, { ...edited, disabledFeatures: [] })).toBe(false);
  });

  it('reports no changes when a disabled feature is re-added out of order', () => {
    // the feature table drops a feature with a filter and re-adds it to the end of the list, so
    // toggling one off and back on leaves the list re-ordered rather than changed
    const withFeatures = { ...initialValues, disabledFeatures: ['feature-1', 'feature-2'] };

    expect(
      haveFormValuesChanged(withFeatures, { ...withFeatures, disabledFeatures: ['feature-2'] })
    ).toBe(true);
    expect(
      haveFormValuesChanged(withFeatures, {
        ...withFeatures,
        disabledFeatures: ['feature-2', 'feature-1'],
      })
    ).toBe(false);
  });
});
