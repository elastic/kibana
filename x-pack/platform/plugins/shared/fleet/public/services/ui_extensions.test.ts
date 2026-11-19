/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';

import type {
  PackagePolicyEditExtensionComponent,
  PackagePolicyReplaceDefineStepExtensionComponent,
  UIExtensionRegistrationCallback,
  UIExtensionsStorage,
} from '../types';

import { createExtensionRegistrationCallback } from './ui_extensions';

describe('UI Extension services', () => {
  describe('When using createExtensionRegistrationCallback factory', () => {
    let storage: UIExtensionsStorage;
    let register: UIExtensionRegistrationCallback;

    beforeEach(() => {
      storage = {};
      register = createExtensionRegistrationCallback(storage);
    });

    it('should return a function', () => {
      expect(register).toBeInstanceOf(Function);
    });

    it('should store an extension points', () => {
      const LazyCustomView = lazy<PackagePolicyEditExtensionComponent>(async () => {
        return { default: (() => {}) as unknown as PackagePolicyEditExtensionComponent };
      });
      register({
        view: 'package-policy-edit',
        package: 'endpoint',
        Component: LazyCustomView,
      });

      expect(storage.endpoint['package-policy-edit']).toEqual({
        view: 'package-policy-edit',
        package: 'endpoint',
        Component: LazyCustomView,
      });
    });

    it('should store useWidePageLayout on package-policy-replace-define-step', () => {
      const LazyCustomView = lazy<PackagePolicyReplaceDefineStepExtensionComponent>(async () => {
        return {
          default: (() => {}) as unknown as PackagePolicyReplaceDefineStepExtensionComponent,
        };
      });
      register({
        view: 'package-policy-replace-define-step',
        package: 'cribl',
        Component: LazyCustomView,
        useWidePageLayout: true,
      });

      expect(storage.cribl['package-policy-replace-define-step']).toEqual({
        view: 'package-policy-replace-define-step',
        package: 'cribl',
        Component: LazyCustomView,
        useWidePageLayout: true,
      });
    });

    it('should throw if extension point has already registered', () => {
      const LazyCustomView = lazy<PackagePolicyEditExtensionComponent>(async () => {
        return { default: (() => {}) as unknown as PackagePolicyEditExtensionComponent };
      });
      const LazyCustomView2 = lazy<PackagePolicyEditExtensionComponent>(async () => {
        return { default: (() => {}) as unknown as PackagePolicyEditExtensionComponent };
      });

      register({
        view: 'package-policy-edit',
        package: 'endpoint',
        Component: LazyCustomView,
      });

      expect(() => {
        register({
          view: 'package-policy-edit',
          package: 'endpoint',
          Component: LazyCustomView2,
        });
      }).toThrow();

      expect(storage.endpoint['package-policy-edit']).toEqual({
        view: 'package-policy-edit',
        package: 'endpoint',
        Component: LazyCustomView,
      });
    });
  });
});
