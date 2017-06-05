export class BinderBase {
  constructor() {
    this.disposal = [];
  }

  on(emitter, ...args) {
    const on = emitter.on || emitter.addListener;
    const off = emitter.off || emitter.removeListener;

    on.apply(emitter, args);
    this.disposal.push(() => off.apply(emitter, args));
  }

  destroy() {
    const destroyers = this.disposal;
    this.disposal = [];
    destroyers.forEach(fn => fn());
  }
}
