/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';
import { ModelUpdater } from '../model_updater';

describe('Model Updater for Angular Controller with React Components', () => {
  let $scope;
  let model;
  let updater;

  beforeEach(() => {
    $scope = {};
    $scope.$evalAsync = cb => cb();

    model = {};

    updater = new ModelUpdater($scope, model);
    sinon.spy(updater, 'updateModel');
  });

  test('should successfully construct an object', () => {
    expect(typeof updater).toBe('object');
    expect(updater.updateModel.called).toBe(false);
  });

  test('updateModel method should add properties to the model', () => {
    expect(typeof updater).toBe('object');
    updater.updateModel({
      foo: 'bar',
      bar: 'baz',
      error: 'monkeywrench',
    });
    expect(model).toEqual({
      foo: 'bar',
      bar: 'baz',
      error: 'monkeywrench',
    });
  });

  test('updateModel method should push properties to the model if property is originally an array', () => {
    model.errors = ['first'];
    updater.updateModel({
      errors: 'second',
      primitive: 'hello',
    });
    expect(model).toEqual({
      errors: ['first', 'second'],
      primitive: 'hello',
    });
  });
});
