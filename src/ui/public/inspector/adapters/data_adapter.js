import EventEmitter from 'events';

class DataAdapter extends EventEmitter {

  setTabularLoader(callback) {
    this._tabular = callback;
    this.emit('change', 'tabular');
  }

  getTabular() {
    return Promise.resolve(this._tabular ? this._tabular() : null);
  }

}

export { DataAdapter };
