import { isString, startsWith } from 'lodash';

/**
 * Serializes the given object into a JSON string
 *
 * All properties that begin with $ throughout the entire object are omitted.
 * If a custom JSON serializer function is passed, then the given object is
 * passed through it before being re-stringified with the native stringify.
 *
 * The space argument is passed unaltered to the native stringify.
 */
export function toJson(object, jsonFn, space) {
  if (jsonFn) {
    // We reparse the stringified json so that we can lean on JSON.stringify's
    // avoiding-infinite-recursion capabilities when stripping out any
    // remaining properties that begin with a dollar sign ($)
    object = JSON.parse(jsonFn(object));
  }
  return JSON.stringify(object, replacer, space);
}

/**
 * Returns the given value if the key does not begin with a dollar sign ($)
 */
export function replacer(key, value) {
  return isString(key) && startsWith(key, '$') ? undefined : value;
}
