/**
 * A handler to the embedded visualization. It offers several methods to interact
 * with the visualization.
 */
export class EmbeddedVisualizeHandler {
  constructor(element, scope) {
    this._element = element;
    this._scope = scope;
    this._renderComplete = new Promise(resolve => {
      this._element.on('renderComplete', resolve);
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
   * Returns a promise, that will resolve (without a value) once the rendering of
   * the visualization has finished.
   *
   * @returns {Promise} Promise, that resolves as soon as the visualization is done rendering.
   */
  onRenderComplete() {
    return this._renderComplete;
  }

}
