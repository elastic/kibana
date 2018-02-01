import _ from 'lodash';

// Copied from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

/**
 * Returns a list of fields matching the given pattern.
 * @param {string} pattern - Field name with optional wildcards.
 * @param indexPattern
 * @return {Field[]} - a list of index pattern Fields
 */
export function getFieldsByWildcard(pattern, indexPattern) {
  if (pattern.includes('*')) {
    const userInputLiterals = pattern.split('*');
    const escapedUserInputLiterals = userInputLiterals.map(escapeRegExp);
    const regexPattern = `^${escapedUserInputLiterals.join('.*')}$`;
    const regex = new RegExp(regexPattern);

    const fields = indexPattern.fields.filter((field) => {
      return regex.test(field.name);
    });

    if (_.isEmpty(fields)) {
      throw new Error(`No fields match the pattern ${pattern}`);
    }

    return fields;
  }
  else {
    return [indexPattern.fields.byName[pattern]];
  }
}

