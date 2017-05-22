/**
 * Interactive elements must be able to receive focus.
 *
 * Ideally, this means using elements that are natively keyboard accessible (<a href="">,
 * <input type="button">, or <button>). Note that links should be used when navigating and buttons
 * should be used when performing an action on the page.
 *
 * If you need to use a <div>, <p>, or <a> without the href attribute, then you need to allow
 * them to receive focus and to respond to keyboard input. The workaround is to:
 *
 *   - Give the element tabindex="0" so that it can receive keyboard focus.
 *   - Add a JavaScript onkeyup event handler that triggers element functionality if the Enter key
 *     is pressed while the element is focused. This is necessary because some browsers do not trigger
 *    onclick events for such elements when activated via the keyboard.
 *   - If the item is meant to function as a button, the onkeyup event handler should also detect the
 *     Spacebar in addition to the Enter key, and the element should be given role="button".
 *
 * Wrap any of these elements in this component to automatically do the above.
 */

import {
  Component,
  cloneElement,
} from 'react';

import {
  ENTER_KEY,
  SPACE_KEY,
} from '../../services';

export class KuiKeyboardAccessible extends Component {
  onKeyDown = e => {
    // Prevent a scroll from occurring if the user has hit space.
    if (e.keyCode === SPACE_KEY) {
      e.preventDefault();
    }
  }

  onKeyUp = e => {
    // Support keyboard accessibility by emulating mouse click on ENTER or SPACE keypress.
    if (e.keyCode === ENTER_KEY || e.keyCode === SPACE_KEY) {
      // Delegate to the click handler on the element.
      this.props.children.props.onClick(e);
    }
  }

  applyKeyboardAccessibility(child) {
    // Add attributes required for accessibility unless they are already specified.
    const props = {
      tabIndex: '0',
      role: 'button',
      ...child.props,
      onKeyDown: this.onKeyDown,
      onKeyUp: this.onKeyUp,
    };

    return cloneElement(child, props);
  }

  render() {
    return this.applyKeyboardAccessibility(this.props.children);
  }
}

const keyboardInaccessibleElement = (props, propName, componentName) => {
  const child = props.children;

  if (!child) {
    throw new Error(`${componentName} needs to wrap an element with which the user interacts.`);
  }

  // The whole point of this component is to hack in functionality that native buttons provide
  // by default.
  if (child.type === 'button') {
    throw new Error(`${componentName} doesn't need to be used on a button.`);
  }

  if (child.type === 'a' && child.props.href !== undefined) {
    throw new Error(`${componentName} doesn't need to be used on a link if it has a href attribute.`);
  }

  // We're emulating a click action, so we should already have a regular click handler defined.
  if (!child.props.onClick) {
    throw new Error(`${componentName} needs to wrap an element which has an onClick prop assigned.`);
  }

  if (typeof child.props.onClick !== 'function') {
    throw new Error(`${componentName}'s child's onClick prop needs to be a function.`);
  }

  if (child.props.onKeyDown) {
    throw new Error(`${componentName}'s child can't have an onKeyDown prop because the implementation will override it.`);
  }

  if (child.props.onKeyUp) {
    throw new Error(`${componentName}'s child can't have an onKeyUp prop because the implementation will override it.`);
  }
};

KuiKeyboardAccessible.propTypes = {
  children: keyboardInaccessibleElement,
};
