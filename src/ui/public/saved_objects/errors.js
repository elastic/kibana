export class DuplicateTitleError extends Error {
  constructor(...args) {
    super(...args);

    // Work around for babel error
    // Babel generated Error subclass produces instance of Error rather than instance of subclass
    // https://github.com/babel/babel/issues/4485
    this.constructor = DuplicateTitleError;
    this.__proto__   = DuplicateTitleError.prototype; // eslint-disable-line no-proto
  }
}
