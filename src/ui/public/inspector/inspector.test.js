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

import { hasInspector, openInspector } from './inspector';
jest.mock('./view_registry', () => ({
  viewRegistry: {
    getVisible: jest.fn(),
  },
}));
jest.mock('./ui/inspector_panel', () => ({
  InspectorPanel: () => 'InspectorPanel',
}));
import { viewRegistry } from './view_registry';

function setViews(views) {
  viewRegistry.getVisible.mockImplementation(() => views);
}

describe('Inspector', () => {
  describe('hasInspector()', () => {
    it('should return false if no view would be available', () => {
      setViews([]);
      expect(hasInspector({})).toBe(false);
    });

    it('should return true if views would be available', () => {
      setViews([{}]);
      expect(hasInspector({})).toBe(true);
    });
  });

  describe('openInspector()', () => {
    it('should throw an error if no views available', () => {
      setViews([]);
      expect(() => openInspector({})).toThrow();
    });

    describe('return value', () => {
      beforeEach(() => {
        setViews([{}]);
      });

      it('should be an object with a close function', () => {
        const session = openInspector({});
        expect(typeof session.close).toBe('function');
      });

      it('should emit the "closed" event if another inspector opens', () => {
        const session = openInspector({});
        const spy = jest.fn();
        session.on('closed', spy);
        openInspector({});
        expect(spy).toHaveBeenCalled();
      });

      it('should emit the "closed" event if you call close', () => {
        const session = openInspector({});
        const spy = jest.fn();
        session.on('closed', spy);
        session.close();
        expect(spy).toHaveBeenCalled();
      });

      it('can be bound to an angular scope', () => {
        const session = openInspector({});
        const spy = jest.fn();
        session.on('closed', spy);
        const scope = {
          $on: jest.fn(() => () => {})
        };
        session.bindToAngularScope(scope);
        expect(scope.$on).toHaveBeenCalled();
        const onCall = scope.$on.mock.calls[0];
        expect(onCall[0]).toBe('$destroy');
        expect(typeof onCall[1]).toBe('function');
        // Call $destroy callback, as angular would when the scope gets destroyed
        onCall[1]();
        expect(spy).toHaveBeenCalled();
      });

      it('will remove from angular scope when closed', () => {
        const session = openInspector({});
        const unwatchSpy = jest.fn();
        const scope = {
          $on: jest.fn(() => unwatchSpy)
        };
        session.bindToAngularScope(scope);
        session.close();
        expect(unwatchSpy).toHaveBeenCalled();
      });
    });
  });
});
