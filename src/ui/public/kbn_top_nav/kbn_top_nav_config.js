/**
 * A configuration object for a top nav component.
 * @typedef {Object} KbnTopNavConfig
 * @type Object
 * @property {string} key - A display string which will be shown in the top nav for this option.
 * @property {string} [description] - optional, used for the screen-reader description of this
 *  menu. Defaults to "Toggle ${key} view" for templated menu items and just "${key}" for
 *  programmatic menu items
 * @property {string} testId - for testing purposes, can be used to retrieve this item.
 * @property {Object} [template] - an html template that will be shown when this item is clicked.
 *  If template is not given then run should be supplied.
 * @property {function} [run] - an optional function that will be run when the nav item is clicked.
 *  Either this or template parameter should be specified.
 * @param {boolean} [hideButton] - optional, set to true to prevent a menu item from being created.
 *  This allow injecting templates into the navbar that don't have an associated template
 */

/**
 *
 * @param {string} key
 * @param {string} description
 * @param {string} testId
 * @param {Object} template
 * @returns {KbnTopNavConfig}
 */
export function createTopNavTemplateConfig(key, description, testId, template) {
  return { key, description, testId, template };
}

/**
 *
 * @param {string} key
 * @param {string} description
 * @param {string} testId
 * @param {function} run
 * @returns {KbnTopNavConfig}
 */
export function createTopNavExecuteConfig(key, description, testId, run) {
  return { key, description, testId, run };
}
