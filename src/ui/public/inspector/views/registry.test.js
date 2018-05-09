import { InspectorViewRegistry } from './registry';


function createMockView(params = {}) {
  return {
    name: params.name || 'view',
    icon: params.icon || 'icon',
    help: params.help || 'help text',
    component: params.component || (() => {}),
    order: params.order,
    shouldShow: params.shouldShow,
  };
}

describe('InspectorViewRegistry', () => {

  let registry;

  beforeEach(() => {
    registry = new InspectorViewRegistry();
  });

  it('should emit a change event when registering a view', () => {
    const listener = jest.fn();
    registry.once('change', listener);
    registry.register(createMockView());
    expect(listener).toHaveBeenCalled();
  });

  it('should return views ordered by their order property', () => {
    const view1 = createMockView({ name: 'view1', order: 2000 });
    const view2 = createMockView({ name: 'view2', order: 1000 });
    registry.register(view1);
    registry.register(view2);
    const views = registry.getAll();
    expect(views.map(v => v.name)).toEqual(['view2', 'view1']);
  });

  describe('getVisible()', () => {
    it('should return empty array on passing null to the registry', () => {
      const view1 = createMockView({ name: 'view1', shouldShow: () => true });
      const view2 = createMockView({ name: 'view2', shouldShow: () => false });
      registry.register(view1);
      registry.register(view2);
      const views = registry.getVisible(null);
      expect(views).toEqual([]);
    });

    it('should only return matching views', () => {
      const view1 = createMockView({ name: 'view1', shouldShow: () => true });
      const view2 = createMockView({ name: 'view2', shouldShow: () => false });
      registry.register(view1);
      registry.register(view2);
      const views = registry.getVisible({});
      expect(views.map(v => v.name)).toEqual(['view1']);
    });

    it('views without shouldShow should be included', () => {
      const view1 = createMockView({ name: 'view1', shouldShow: () => true });
      const view2 = createMockView({ name: 'view2' });
      registry.register(view1);
      registry.register(view2);
      const views = registry.getVisible({});
      expect(views.map(v => v.name)).toEqual(['view1', 'view2']);
    });

    it('should pass the adapters to the callbacks', () => {
      const shouldShow = jest.fn();
      const view1 = createMockView({ shouldShow });
      registry.register(view1);
      const adapter = { foo: () => {} };
      registry.getVisible(adapter);
      expect(shouldShow).toHaveBeenCalledWith(adapter);
    });
  });
});
