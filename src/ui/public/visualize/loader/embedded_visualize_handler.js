import { EventEmitter } from 'events';

const RENDER_COMPLETE_EVENT = 'render_complete';

/**
 * A handler to the embedded visualization. It offers several methods to interact
 * with the visualization.
 */
export class EmbeddedVisualizeHandler {
  constructor(element, scope) {
    this._element = element;
    this._scope = scope;
    this._listeners = new EventEmitter();
    // Listen to the first RENDER_COMPLETE_EVENT to resolve this promise
    this._firstRenderComplete = new Promise(resolve => {
      this._listeners.once(RENDER_COMPLETE_EVENT, resolve);
    });
    this._element.on('renderComplete', () => {
      this._listeners.emit(RENDER_COMPLETE_EVENT);
    });
  }

  /**
   * Destroy the underlying Angular scope of the visualization. This should be
   * called whenever you remove the visualization.
   */
  destroy() {
    this._scope.$destroy();
  }

  /**
   * Return the actual DOM element (wrapped in jQuery) of the rendered visualization.
   * This is especially useful if you used `append: true` in the parameters where
   * the visualization will be appended to the specified container.
   */
  getElement() {
    return this._element;
  }

  /**
   * Returns a promise, that will resolve (without a value) once the first rendering of
   * the visualization has finished. If you want to listen to concecutive rendering
   * events, look into the `addRenderCompleteListener` method.
   *
   * @returns {Promise} Promise, that resolves as soon as the visualization is done rendering
   *    for the first time.
   */
  whenFirstRenderComplete() {
    return this._firstRenderComplete;
  }

  /**
   * Adds a listener to be called whenever the visualization finished rendering.
   * This can be called multiple times, when the visualization rerenders, e.g. due
   * to new data.
   *
   * @param {function} listener The listener to be notified about complete renders.
   */
  addRenderCompleteListener(listener) {
    this._listeners.addListener(RENDER_COMPLETE_EVENT, listener);
  }

  /**
   * Removes a previously registered render complete listener from this handler.
   * This listener will no longer be called when the visualization finished rendering.
   *
   * @param {function} listener The listener to remove from this handler.
   */
  removeRenderCompleteListener(listener) {
    this._listeners.removeListener(RENDER_COMPLETE_EVENT, listener);
  }

}
