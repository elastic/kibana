import { Binder } from './';

export default class BinderFor extends Binder {
  constructor(emitter) {
    super();
    this.emitter = emitter;
  }

  on(...args) {
    super.on(this.emitter, ...args);
  }
}
