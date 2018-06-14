/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import sinon from 'sinon';

import {
  ToastNotifications,
} from './toast_notifications';

describe('ToastNotifications', () => {
  describe('interface', () => {
    let toastNotifications;

    beforeEach(() => {
      toastNotifications = new ToastNotifications();
    });

    describe('add method', () => {
      test('adds a toast', () => {
        toastNotifications.add({});
        expect(toastNotifications.list.length).toBe(1);
      });

      test('adds a toast with an ID property', () => {
        toastNotifications.add({});
        expect(toastNotifications.list[0].id).toBe(0);
      });

      test('increments the toast ID', () => {
        toastNotifications.add({});
        toastNotifications.add({});
        expect(toastNotifications.list[1].id).toBe(1);
      });

      test('accepts a string', () => {
        toastNotifications.add('New toast');
        expect(toastNotifications.list[0].title).toBe('New toast');
      });
    });

    describe('remove method', () => {
      test('removes a toast', () => {
        const toast = toastNotifications.add('Test');
        toastNotifications.remove(toast);
        expect(toastNotifications.list.length).toBe(0);
      });

      test('ignores unknown toast', () => {
        toastNotifications.add('Test');
        toastNotifications.remove({});
        expect(toastNotifications.list.length).toBe(1);
      });
    });

    describe('onChange method', () => {
      test('callback is called when a toast is added', () => {
        const onChangeSpy = sinon.spy();
        toastNotifications.onChange(onChangeSpy);
        toastNotifications.add({});
        expect(onChangeSpy.callCount).toBe(1);
      });

      test('callback is called when a toast is removed', () => {
        const onChangeSpy = sinon.spy();
        toastNotifications.onChange(onChangeSpy);
        const toast = toastNotifications.add({});
        toastNotifications.remove(toast);
        expect(onChangeSpy.callCount).toBe(2);
      });

      test('callback is not called when remove is ignored', () => {
        const onChangeSpy = sinon.spy();
        toastNotifications.onChange(onChangeSpy);
        toastNotifications.remove({});
        expect(onChangeSpy.callCount).toBe(0);
      });
    });

    describe('addSuccess method', () => {
      test('adds a success toast', () => {
        toastNotifications.addSuccess({});
        expect(toastNotifications.list[0].color).toBe('success');
      });
    });

    describe('addWarning method', () => {
      test('adds a warning toast', () => {
        toastNotifications.addWarning({});
        expect(toastNotifications.list[0].color).toBe('warning');
      });
    });

    describe('addDanger method', () => {
      test('adds a danger toast', () => {
        toastNotifications.addDanger({});
        expect(toastNotifications.list[0].color).toBe('danger');
      });
    });
  });
});
