/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { globalSearchPluginMock } from '@kbn/global-search-plugin/public/mocks';
import { GlobalSearchBarPlugin } from './plugin';
import type { SearchModalProps } from './components/types';

let lastSearchModalProps: SearchModalProps | undefined;

jest.mock('@kbn/react-kibana-mount', () => ({
  toMountPoint: (node: React.ReactElement) => {
    if (node?.props) {
      lastSearchModalProps = node.props as SearchModalProps;
    }
    return () => () => undefined;
  },
}));

describe('GlobalSearchBarPlugin', () => {
  beforeEach(() => {
    lastSearchModalProps = undefined;
  });

  describe('start', () => {
    const createPlugin = () => {
      return new GlobalSearchBarPlugin(
        coreMock.createPluginInitializerContext({
          input_max_limit: 2000,
        })
      );
    };

    it('registers globalSearch', () => {
      const coreSetup = coreMock.createSetup();

      const service = createPlugin();

      service.setup(coreSetup);

      const coreStart = coreMock.createStart();

      const setSpy = jest.spyOn(coreStart.chrome.next.globalSearch, 'set');

      service.start(coreStart, {
        globalSearch: globalSearchPluginMock.createStartContract(),
      });

      expect(setSpy).toHaveBeenCalledTimes(1);
    });

    it('awaits search overlay close before navigateToUrl from the search modal', async () => {
      const coreSetup = coreMock.createSetup();
      const service = createPlugin();
      service.setup(coreSetup);

      const coreStart = coreMock.createStart();

      let resolveClose: () => void = () => {};
      const onClosePromise = new Promise<void>((resolve) => {
        resolveClose = resolve;
      });
      const overlayRef = {
        close: jest.fn().mockReturnValue(onClosePromise),
        onClose: onClosePromise,
      };
      coreStart.overlays.openModal = jest.fn().mockReturnValue(overlayRef);

      const order: string[] = [];
      jest.spyOn(coreStart.application, 'navigateToUrl').mockImplementation(async () => {
        order.push('navigate');
      });

      service.start(coreStart, {
        globalSearch: globalSearchPluginMock.createStartContract(),
      });

      const onClick = (coreStart.chrome.next.globalSearch.set as jest.Mock).mock.calls[0][0]
        .onClick as () => void;
      onClick();

      expect(coreStart.overlays.openModal).toHaveBeenCalledTimes(1);
      expect(lastSearchModalProps).toBeDefined();

      const navigatePromise = lastSearchModalProps!.navigateToUrl('/app/discover');
      expect(overlayRef.close).toHaveBeenCalledTimes(1);
      expect(coreStart.application.navigateToUrl).not.toHaveBeenCalled();

      resolveClose();
      await navigatePromise;

      expect(coreStart.application.navigateToUrl).toHaveBeenCalledWith('/app/discover', undefined);
      expect(order).toEqual(['navigate']);
    });
  });
});
