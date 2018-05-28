import { DataAdapter } from './data_adapter';

describe('DataAdapter', () => {
  let adapter: DataAdapter = null;

  beforeEach(() => {
    adapter = new DataAdapter();
  });

  describe('getTabular()', () => {
    it('should return a null promise when called before initialized', () => {
      expect(adapter.getTabular()).resolves.toBe(null);
    });

    it('should call the provided callback and resolve with its value', () => {
      const spy = jest.fn(() => 'foo');
      adapter.setTabularLoader(spy);
      expect(spy).not.toBeCalled();
      const result = adapter.getTabular();
      expect(spy).toBeCalled();
      expect(result).resolves.toBe('foo');
    });
  });

  it('should emit a "tabular" event when a new tabular loader is specified', () => {
    const spy = jest.fn();
    adapter.once('change', spy);
    adapter.setTabularLoader(() => 42);
    expect(spy).toBeCalled();
  });
});
