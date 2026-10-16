/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CUSTOM_APP_FEATURE_ID, CUSTOM_APP_SAVED_OBJECT_TYPE } from '../common/constants';
import { customAppFeature } from './feature';

describe('the custom apps feature', () => {
  it('has the id the plugin refers to it by', () => {
    expect(customAppFeature.id).toBe(CUSTOM_APP_FEATURE_ID);
  });

  it('lets All write saved apps and Read only read them', () => {
    expect(customAppFeature.privileges?.all.savedObject).toEqual({
      all: [CUSTOM_APP_SAVED_OBJECT_TYPE],
      read: [],
    });
    expect(customAppFeature.privileges?.read.savedObject).toEqual({
      all: [],
      read: [CUSTOM_APP_SAVED_OBJECT_TYPE],
    });
  });

  it('only lets All save, and lets both show', () => {
    expect(customAppFeature.privileges?.all.ui).toEqual(['save', 'show']);
    expect(customAppFeature.privileges?.read.ui).toEqual(['show']);
  });

  it('grants nothing about running workflows: that is the Workflows feature, for whoever clicks', () => {
    const text = JSON.stringify(customAppFeature.privileges);
    expect(text).not.toContain('workflow');
  });
});
