/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

jest.mock('react-router-dom', () => ({
  Prompt: () => null,
}));
import { Prompt } from 'react-router-dom';

import { shallow, mount, ReactWrapper } from 'enzyme';

import { UnsavedChangesPrompt } from './unsaved_changes_prompt';

describe('UnsavedChangesPrompt', () => {
  let addEventListenerSpy: jest.SpyInstance;
  let removeEventListenerSpy: jest.SpyInstance;

  beforeAll(() => {
    addEventListenerSpy = jest.spyOn(window, 'addEventListener').mockImplementation(() => true);
    removeEventListenerSpy = jest
      .spyOn(window, 'removeEventListener')
      .mockImplementation(() => true);
  });

  afterAll(() => {
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  it('renders a React Router Prompt, which will show users a confirmation message when navigating within the SPA if hasUnsavedChanges is true', () => {
    const wrapper = shallow(<UnsavedChangesPrompt hasUnsavedChanges />);
    const prompt = wrapper.find(Prompt);
    expect(prompt.exists()).toBe(true);
    expect(prompt.prop('when')).toBe(true);
    expect(prompt.prop('message')).toBe(
      'Your changes have not been saved. Are you sure you want to leave?'
    );
  });

  it('the message text of the prompt can be customized', () => {
    const wrapper = shallow(
      <UnsavedChangesPrompt hasUnsavedChanges messageText="Some custom text" />
    );
    expect(wrapper.find(Prompt).prop('message')).toBe('Some custom text');
  });

  describe('external navigation', () => {
    let wrapper: ReactWrapper;
    const getAddBeforeUnloadEventCalls = () =>
      addEventListenerSpy.mock.calls.filter((call) => call[0] === 'beforeunload');
    const getRemoveBeforeUnloadEventCalls = () =>
      removeEventListenerSpy.mock.calls.filter((call) => call[0] === 'beforeunload');
    const getLastRegisteredBeforeUnloadEventHandler = () => {
      const calls = getAddBeforeUnloadEventCalls();
      return calls[calls.length - 1][1];
    };

    beforeAll(() => {
      wrapper = mount(<UnsavedChangesPrompt hasUnsavedChanges />);
    });

    it('sets up a handler for the beforeunload event', () => {
      const calls = getAddBeforeUnloadEventCalls();
      expect(calls.length).toBe(1);
    });

    it('that handler will show users a confirmation message when navigating outside the SPA if hasUnsavedChanges is true', () => {
      const handler = getLastRegisteredBeforeUnloadEventHandler();
      const event = { returnValue: null, preventDefault: jest.fn() };

      handler(event);
      expect(event.returnValue).toEqual('');
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('will not register a new handler if there is a re-render and hasUnsavedChanges is still true', () => {
      wrapper.setProps({ hasUnsavedChanges: true, messageText: 'custom message text' });
      const calls = getAddBeforeUnloadEventCalls();
      expect(calls.length).toBe(1);
    });

    it('when the hasUnsavedChanges prop changes to false, it will deregister the old handler and create a new one, which will not show users a confirmation', () => {
      const initialHandler = getLastRegisteredBeforeUnloadEventHandler();

      wrapper.setProps({ hasUnsavedChanges: false });

      // The old handler is unregistered
      const unregisterCalls = getRemoveBeforeUnloadEventCalls();
      expect(unregisterCalls.length).toBe(1);
      expect(unregisterCalls[0][1]).toBe(initialHandler);

      // The new handler is registered
      const calls = getAddBeforeUnloadEventCalls();
      expect(calls.length).toBe(2);
      const newHandler = getLastRegisteredBeforeUnloadEventHandler();

      // The new handler does not show a confirmation message
      const event = { returnValue: null, preventDefault: jest.fn() };
      newHandler(event);
      expect(event.returnValue).toEqual(null);
      expect(event.preventDefault).not.toHaveBeenCalled();
    });
  });
});
