
import { attempt } from 'bluebird';

import PageObjects from './page_objects';

export default class BddWrapper {
  constructor(real) {
    this.real = real;
  }

  errorWrapper = fn => {
    // we want to assume the context set
    // by the test runner, so don't use an arrow
    return function () {
      const suiteOrTest = this;
      const errorHandler = PageObjects.common.createErrorHandler(suiteOrTest);
      return attempt(fn.bind(suiteOrTest)).catch(errorHandler);
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
