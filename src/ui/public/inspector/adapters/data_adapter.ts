import { EventEmitter } from 'events';

// TODO: add a more specific TabularData type.
type TabularData = any;
type TabularCallback = () => TabularData | Promise<TabularData>;

class DataAdapter extends EventEmitter {
  private tabular?: TabularCallback;

  public setTabularLoader(callback: TabularCallback): void {
    this.tabular = callback;
    this.emit('change', 'tabular');
  }

  public getTabular(): Promise<TabularData> {
    return Promise.resolve(this.tabular ? this.tabular() : null);
  }
}

export { DataAdapter };
