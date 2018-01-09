import './directive';

const dispatchCustomEvent = (el, eventName) => {
// we're using the native events so that we aren't tied to the jQuery custom events,
  // otherwise we have to use jQuery(element).on(...) because jQuery's events sit on top
  // of the native events per https://github.com/jquery/jquery/issues/2476
  el.dispatchEvent(new CustomEvent(eventName, { bubbles: true }));
};

export function dispatchRenderComplete(el) {
  dispatchCustomEvent(el, 'renderComplete');
}

export function dispatchRenderStart(el) {
  dispatchCustomEvent(el, 'renderStart');
}
