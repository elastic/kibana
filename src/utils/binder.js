export default class Binder {
  constructor() {
    this.disposal = [];
  }

  on(emitter, event, handler) {
    const on = emitter.on || emitter.addListener;
    const off = emitter.off || emitter.removeListener;

    on.call(emitter, event, handler);
    this.disposal.push(() => off.call(emitter, event, handler));
  }

  destroy() {
    const destroyers = this.disposal;
    this.disposal = [];
    destroyers.forEach(fn => fn());
  }
}
