import { BinderBase } from './binder';

export class BinderFor extends BinderBase {
  constructor(emitter) {
    super();
    this.emitter = emitter;
  }

  on(...args) {
    super.on(this.emitter, ...args);
  }
}
