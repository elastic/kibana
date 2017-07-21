import _ from 'lodash';

export function ParseQueryLibFromUserProvider() {

  /**
   * Take userInput from the user and make it into a query object
   * @param {userInput} user's query input
   * @returns {object}
   */
  return function (userInput) {
    const matchAll = '';

    if (_.isObject(userInput)) {
      // If we get an empty object, treat it as a *
      if (!Object.keys(userInput).length) {
        return matchAll;
      }
      return userInput;
    }

    // Nope, not an object.
    userInput = (userInput || '').trim();
    if (userInput.length === 0) return matchAll;

    if (userInput[0] === '{') {
      try {
        return JSON.parse(userInput);
      } catch (e) {
        return userInput;
      }
    } else {
      return userInput;
    }
  };
}

