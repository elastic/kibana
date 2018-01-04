import { flatConcatValuesAtType } from './reduce';
import { mapSpec, alias, wrap } from './modify_reduce';

/**
 *  Reducer "preset" that merges named "first-class" appExtensions by
 *  converting them into objects and then concatenating the values of those objects
 *  @type {Function}
 */
const appExtension = wrap(
  mapSpec((spec, type) => ({ [type]: spec })),
  alias('appExtensions'),
  flatConcatValuesAtType
);

// plain extension groups produce lists of modules that will be required by the entry
// files to include extensions of specific types into specific apps
export const visTypes = appExtension;
export const visResponseHandlers = appExtension;
export const visRequestHandlers = appExtension;
export const visEditorTypes = appExtension;
export const savedObjectTypes = appExtension;
export const embeddableFactories = appExtension;
export const fieldFormats = appExtension;
export const fieldFormatEditors = appExtension;
export const spyModes = appExtension;
export const chromeNavControls = appExtension;
export const navbarExtensions = appExtension;
export const managementSections = appExtension;
export const devTools = appExtension;
export const docViews = appExtension;
export const hacks = appExtension;
export const home = appExtension;

// aliases visTypeEnhancers to the visTypes group
export const visTypeEnhancers = wrap(alias('visTypes'), appExtension);

// adhoc extension groups can define new extension groups on the fly
// so that plugins could concat their own
export const aliases = flatConcatValuesAtType;
