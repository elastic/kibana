import { attempt } from 'bluebird';

import { common } from './';

export default class BddWrapper {
  constructor(real) {
    this.real = real;
  }

  errorWrapper = fn => {
    // we want to assume the context set
    // by the test runner, so don't use an arrow
    return function () {
      const suiteOrTest = this;
      return attempt(fn.bind(suiteOrTest)).catch(common.handleError(suiteOrTest));
    };
  }

  describe = (name, fn) => {
    this.real.describe(name, fn);
  }

  before = (fn) => {
    this.real.before(this.errorWrapper(fn));
  }

  beforeEach = (fn) => {
    this.real.beforeEach(this.errorWrapper(fn));
  }

  it = (name, fn) => {
    this.real.it(name, this.errorWrapper(fn));
  }

  afterEach = (fn) => {
    this.real.afterEach(this.errorWrapper(fn));
  }

  after = (fn) => {
    this.real.after(this.errorWrapper(fn));
  }
}
