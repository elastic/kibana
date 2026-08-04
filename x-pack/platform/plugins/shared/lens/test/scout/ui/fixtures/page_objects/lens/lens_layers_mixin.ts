/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import type { LensAppConstructor } from './mixin_types';

/** Layer tabs, data-view switching per layer, and layer add/remove. */
export function withLensLayers<TBase extends LensAppConstructor>(Base: TBase) {
  return class extends Base {
    // Tab `data-test-subj` values use layer ids (not numeric indices); this only ever
    // resolves to elements when there are 2+ layers (EUI hides the tab strip for one).
    public get layerTabsLocator() {
      return this.page.testSubj.locator('^unifiedTabs_tab_');
    }

    /**
     * Switches the data view of a Lens layer via the layer's data view picker.
     *
     * @param dataViewTitle - title of the target data view (must already exist in the space).
     * @param layerIndex - layer to switch; defaults to the first layer.
     */
    async switchLayerIndexPattern(dataViewTitle: string, layerIndex = 0) {
      const trigger = this.getLayerIndexPatternTrigger(layerIndex);
      await trigger.click();
      const switcher = this.page.testSubj.locator('indexPattern-switcher');
      await switcher.waitFor({ state: 'visible' });
      await this.page.testSubj.typeWithDelay('indexPattern-switcher--input', dataViewTitle);
      await switcher.locator(`[data-test-subj="dataView-${dataViewTitle}"]`).click();
      await switcher.waitFor({ state: 'hidden' });
    }

    /** Returns the title of the currently selected data view for the given layer. */
    async getSelectedLayerIndexPattern(layerIndex = 0): Promise<string> {
      const trigger = this.getLayerIndexPatternTrigger(layerIndex);
      await trigger.waitFor({ state: 'visible' });
      return (await trigger.innerText()).trim();
    }

    getLayerIndexPatternTrigger(layerIndex: number) {
      return layerIndex === 0
        ? this.page.testSubj.locator('lns_layerIndexPatternLabel')
        : this.page.testSubj.locator(`lns-layerPanel-${layerIndex} > lns_layerIndexPatternLabel`);
    }

    /**
     * Activates the layer tab at `index`. Requires the tabs row to be visible (multi-layer charts).
     * Tab `data-test-subj` values use layer ids (not numeric indices), so tabs are resolved by order.
     */
    async activateLayerTab(index: number) {
      await expect.poll(async () => await this.layerTabsLocator.count()).toBeGreaterThan(index);

      const tabs = await this.layerTabsLocator.all();
      const tab = tabs[index];
      if (!tab) {
        throw new Error(`Layer tab not found at index ${index}`);
      }

      await tab.click();
      await this.page.testSubj.locator(`lns-layerPanel-${index}`).waitFor({ state: 'visible' });
    }

    /**
     * Ensures the layer tab at `index` is active, tolerating the single-layer case where the
     * tabs row isn't rendered at all (the lone layer's panel is already showing). Unlike
     * `activateLayerTab`, this is a no-op both when the tab is already selected and when there's
     * no tab bar to select from.
     */
    async ensureLayerTabIsActive(index = 0) {
      const tabs = await this.layerTabsLocator.all();
      const tab = tabs[index];
      if (!tab) {
        return;
      }
      if ((await tab.getAttribute('aria-selected')) === 'true') {
        return;
      }
      await tab.click();
      await this.page.testSubj.locator(`lns-layerPanel-${index}`).waitFor({ state: 'visible' });
    }

    /**
     * Opens the layer-actions popover for the layer at `index` and clicks the given action
     * (e.g. `lnsXY_annotationLayer_saveToLibrary`).
     */
    async performLayerAction(testSubject: string, layerIndex = 0) {
      await this.hoverLayerTab(layerIndex);
      // The layer actions mount after the hover, so wait for the popover trigger to render
      // instead of clicking straight away.
      const splitButton = this.page.testSubj.locator(`lnsLayerSplitButton--${layerIndex}`);
      await splitButton.waitFor({ state: 'visible' });
      await splitButton.click();
      await this.page.testSubj.click(testSubject);
    }

    /** Hovers the layer tab at `index`, if the tabs row is rendered (hidden for a single layer). */
    async hoverLayerTab(index: number) {
      const tabs = await this.layerTabsLocator.all();
      await tabs[index]?.hover();
    }

    /** Returns the number of layers in the Lens editor (unified-tabs row is hidden for a single layer). */
    async getLayerCount(): Promise<number> {
      const tabs = await this.layerTabsLocator.count();
      return tabs === 0 ? 1 : tabs;
    }

    /**
     * Adds a visualization layer of the given type (opens the layer-type menu).
     * Caller must use a chart that shows `lnsLayerAddButton-{layerType}` after Add.
     *
     * Annotation layers open a second menu to pick between a new annotation group and one
     * saved in the annotation library; pass `annotationFromLibraryTitle` for the latter.
     */
    async createLayer(
      layerType: 'data' | 'referenceLine' | 'annotations',
      annotationFromLibraryTitle?: string
    ) {
      const tabsBefore = await this.getLayerCount();
      await this.page.testSubj.click('lnsLayerAddButton');
      await this.page.testSubj.click(`lnsLayerAddButton-${layerType}`);
      if (layerType === 'annotations') {
        if (annotationFromLibraryTitle) {
          await this.page.testSubj.click('lnsAnnotationLayer_addFromLibrary');
          await this.page.testSubj.click(
            `savedObjectTitle${annotationFromLibraryTitle.split(' ').join('-')}`
          );
        } else {
          await this.page.testSubj.click('lnsAnnotationLayer_new');
        }
      }
      await this.page.waitForFunction(
        (before) => {
          const tabs = document.querySelectorAll('[data-test-subj^="unifiedTabs_tab_"]').length;
          const count = tabs === 0 ? 1 : tabs;
          return count > before;
        },
        tabsBefore,
        { timeout: 10_000 }
      );
    }

    /**
     * Removes the layer at `index` (FTR `removeLayer`). With a single layer this clears the viz
     * instead of dropping a tab. Returns once the removal is reflected in the config panel, so
     * callers can read the layer count / build a new chart right after.
     */
    async removeLayer(index = 0) {
      const tabsBefore = await this.layerTabsLocator.count();
      await this.hoverLayerTab(index);

      const splitButton = this.page.testSubj.locator(`lnsLayerSplitButton--${index}`);
      const removeButton = this.page.testSubj.locator(`lnsLayerRemove--${index}`);
      // Layers with more than one action (e.g. an annotation layer that can also be saved to the
      // library) hide the remove action behind a split-button popover; single-action layers expose
      // it directly. Exactly one of the two renders, so wait for whichever appears rather than
      // racing the layer actions still mounting after the hover.
      await splitButton.or(removeButton).waitFor({ state: 'visible' });
      if (await splitButton.isVisible()) {
        await splitButton.click();
      }
      await removeButton.click();

      await this.confirmLayerRemovalIfPrompted();

      if (tabsBefore > 0) {
        // waitForFunction has no Scout default (unlike expect/actionTimeout).
        await this.page.waitForFunction(
          (before) =>
            document.querySelectorAll('[data-test-subj^="unifiedTabs_tab_"]').length < before,
          tabsBefore,
          { timeout: 10_000 }
        );
      } else {
        // Clearing the only layer keeps its (now empty) panel, so wait for its dimensions to go.
        await this.page.testSubj.waitForSelector(`lns-layerPanel-${index} > lns-dimensionTrigger`, {
          state: 'detached',
        });
      }
    }

    /**
     * Confirms the modal Lens shows when removing a layer would discard child state it owns
     * (e.g. a library-linked annotation group). The modal mounts asynchronously, so give it a
     * bounded window to appear instead of a one-shot visibility read.
     */
    async confirmLayerRemovalIfPrompted() {
      const removeModal = this.page.testSubj.locator('lnsLayerRemoveModal');
      const isPrompted = await removeModal.waitFor({ state: 'visible', timeout: 2_500 }).then(
        () => true,
        () => false
      );
      if (!isPrompted) {
        return;
      }
      await this.page.testSubj.click('lnsLayerRemoveConfirmButton');
      await removeModal.waitFor({ state: 'hidden' });
    }
  };
}
