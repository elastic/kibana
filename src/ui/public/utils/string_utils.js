export class StringUtils {

  /**
   * Returns a version of the string with the first letter capitalized.
   * @param str {string}
   * @returns {string}
   */
  static upperFirst(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
  }
}
