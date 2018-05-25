import {
  InspectorViewDescription,
  InspectorViewRegistry,
} from './view_registry';

import { Adapters } from './types';

function createMockView(
  params: {
    help?: string;
    order?: number;
    shouldShow?: (view?: Adapters) => boolean;
    title?: string;
  } = {}
): InspectorViewDescription {
  return {
    component: () => null,
    help: params.help || 'help text',
    order: params.order,
    shouldShow: params.shouldShow,
    title: params.title || 'view',
  };
}

describe('InspectorViewRegistry', () => {
  let registry: InspectorViewRegistry;

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
    const view1 = createMockView({ title: 'view1', order: 2000 });
    const view2 = createMockView({ title: 'view2', order: 1000 });
    registry.register(view1);
    registry.register(view2);
    const views = registry.getAll();
    expect(views.map(v => v.title)).toEqual(['view2', 'view1']);
  });

  describe('getVisible()', () => {
    it('should return empty array on passing undefined to the registry', () => {
      const view1 = createMockView({ title: 'view1', shouldShow: () => true });
      const view2 = createMockView({ title: 'view2', shouldShow: () => false });
      registry.register(view1);
      registry.register(view2);
      const views = registry.getVisible();
      expect(views).toEqual([]);
    });

    it('should only return matching views', () => {
      const view1 = createMockView({ title: 'view1', shouldShow: () => true });
      const view2 = createMockView({ title: 'view2', shouldShow: () => false });
      registry.register(view1);
      registry.register(view2);
      const views = registry.getVisible({});
      expect(views.map(v => v.title)).toEqual(['view1']);
    });

    it('views without shouldShow should be included', () => {
      const view1 = createMockView({ title: 'view1', shouldShow: () => true });
      const view2 = createMockView({ title: 'view2' });
      registry.register(view1);
      registry.register(view2);
      const views = registry.getVisible({});
      expect(views.map(v => v.title)).toEqual(['view1', 'view2']);
    });

    it('should pass the adapters to the callbacks', () => {
      const shouldShow = jest.fn();
      const view1 = createMockView({ shouldShow });
      registry.register(view1);
      const adapter = { foo: () => null };
      registry.getVisible(adapter);
      expect(shouldShow).toHaveBeenCalledWith(adapter);
    });
  });
});
