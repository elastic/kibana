/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const TRUTHY = ['true', 'on', 'checked'];

const callSetter = (proto: object, prop: string, el: Element, value: unknown) => {
  Object.getOwnPropertyDescriptor(proto, prop)!.set!.call(el, value);
};

const notify = (el: Element) => {
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
};

/**
 * Sets a form control value through the prototype setter (bypassing React's value tracker)
 * and dispatches the events frameworks listen to. Returns false when the element is not fillable.
 */
export const setNativeValue = (el: Element, value: string): boolean => {
  if (el instanceof HTMLInputElement) {
    if (el.type === 'checkbox' || el.type === 'radio') {
      callSetter(HTMLInputElement.prototype, 'checked', el, TRUTHY.includes(value));
    } else {
      callSetter(HTMLInputElement.prototype, 'value', el, value);
    }
    notify(el);
    return true;
  }
  if (el instanceof HTMLTextAreaElement) {
    callSetter(HTMLTextAreaElement.prototype, 'value', el, value);
    notify(el);
    return true;
  }
  if (el instanceof HTMLSelectElement) {
    const option = Array.from(el.options).find(
      (opt) => (opt.textContent ?? '').trim() === value || opt.value === value
    );
    if (!option) {
      return false;
    }
    callSetter(HTMLSelectElement.prototype, 'value', el, option.value);
    notify(el);
    return true;
  }
  return false;
};
