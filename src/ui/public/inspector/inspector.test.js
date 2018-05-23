import { openInspector, hasInspector } from './inspector';
jest.mock('./view_registry', () => ({
  viewRegistry: {
    getVisible: jest.fn()
  }
}));
jest.mock('./ui/inspector_panel', () => ({
  InspectorPanel: () => 'InspectorPanel'
}));
import { viewRegistry } from './view_registry';

function setViews(views) {
  viewRegistry.getVisible.mockImplementation(() => views);
}

describe('Inspector', () => {
  describe('hasInspector()', () => {
    it('should return false if no view would be available', () => {
      setViews([]);
      expect(hasInspector({})).toBe(false);
    });

    it('should return true if views would be available', () => {
      setViews([{}]);
      expect(hasInspector({})).toBe(true);
    });
  });

  describe('openInspector()', () => {
    it('should throw an error if no views available', () => {
      setViews([]);
      expect(() => openInspector({})).toThrow();
    });

    describe('return value', () => {
      beforeEach(() => {
        setViews([{}]);
      });

      it('should be an object with a close function', () => {
        const session = openInspector({});
        expect(typeof session.close).toBe('function');
      });

      it('should emit the "closed" event if another inspector opens', () => {
        const session = openInspector({});
        const spy = jest.fn();
        session.on('closed', spy);
        openInspector({});
        expect(spy).toHaveBeenCalled();
      });

      it('should emit the "closed" event if you call close', () => {
        const session = openInspector({});
        const spy = jest.fn();
        session.on('closed', spy);
        session.close();
        expect(spy).toHaveBeenCalled();
      });

      it('can be bound to an angular scope', () => {
        const session = openInspector({});
        const spy = jest.fn();
        session.on('closed', spy);
        const scope = {
          $on: jest.fn(() => () => {})
        };
        session.bindToAngularScope(scope);
        expect(scope.$on).toHaveBeenCalled();
        const onCall = scope.$on.mock.calls[0];
        expect(onCall[0]).toBe('$destroy');
        expect(typeof onCall[1]).toBe('function');
        // Call $destroy callback, as angular would when the scope gets destroyed
        onCall[1]();
        expect(spy).toHaveBeenCalled();
      });

      it('will remove from angular scope when closed', () => {
        const session = openInspector({});
        const unwatchSpy = jest.fn();
        const scope = {
          $on: jest.fn(() => unwatchSpy)
        };
        session.bindToAngularScope(scope);
        session.close();
        expect(unwatchSpy).toHaveBeenCalled();
      });
    });
  });
});
