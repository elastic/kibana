/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Call this function to mount a logic file and optionally override default values.
 * Automatically DRYs out a lot of cruft for us, such as resetting context, creating the
 * nested defaults path obj (see https://kea.js.org/docs/api/context#resetcontext), and
 * returning an unmount function
 *
 * Example usage:
 *
 * import { LogicMounter } from '../../../__mocks__/kea_logic';
 * import { SomeLogic } from './';
 *
 * const { mount, unmount } = new LogicMounter(SomeLogic);
 *
 * it('some test', () => {
 *   mount({ someValue: 'hello' }, { someProp: 'world' });
 *   unmount();
 * });
 */
import { resetContext, LogicWrapper } from 'kea';

type LogicFile = LogicWrapper<any>;

export class LogicMounter {
  private logicFile: LogicFile;
  private unmountFn!: Function;

  constructor(logicFile: LogicFile) {
    this.logicFile = logicFile;
  }

  // Reset context with optional default value overrides
  public resetContext = (values?: object, props?: object) => {
    if (!values || !Object.keys(values).length) {
      resetContext({});
    } else {
      let { path, key } = this.logicFile.inputs[0];

      // For keyed logic files, both key and path should be functions
      if (this.logicFile._isKeaWithKey) {
        key = key(props);
        path = path(key);
      }

      // Generate the correct nested defaults obj based on the file path
      // example path: ['x', 'y', 'z']
      // example defaults: { x: { y: { z: values } } }
      const defaults = path.reduceRight(
        (value: object, name: string) => ({ [name]: value }),
        values
      );
      resetContext({ defaults });
    }
  };

  // Automatically reset context & mount the logic file
  public mount = (values?: object, props?: object) => {
    this.resetContext(values, props);

    const logicWithProps = this.logicFile.build(props);
    this.unmountFn = logicWithProps.mount();

    return logicWithProps;
    // NOTE: Unlike kea's mount(), this returns the current
    // built logic instance with props, NOT the unmount fn
  };

  // Also add unmount as a class method that can be destructured on init without becoming stale later
  public unmount = () => {
    this.unmountFn();
  };

  /**
   * Some tests (e.g. async tests, tests that expect thrown errors) need to access
   * listener functions directly instead of calling `SomeLogic.actions.someListener`,
   * due to how Kea invokes/wraps action fns by design.
   *
   * Example usage:
   *
   * const { mount, getListeners } = new LogicMounter(SomeLogic);
   *
   * it('some test', async () => {
   *   mount();
   *   const { someListener } = getListeners({ values: { someMockValue: false } });
   *
   *   const mockBreakpoint = jest.fn();
   *   await someListener({ someMockArgument: true }, mockBreakpoint);
   * });
   */
  public getListeners = (listenersArgs: object = {}) => {
    const { listeners } = this.logicFile.inputs[0];

    return typeof listeners === 'function'
      ? listeners(listenersArgs) // e.g., listeners({ values, actions, props }) => ({ ... })
      : listeners; // handles simpler logic files that just define listeners: { ... }
  };
}
