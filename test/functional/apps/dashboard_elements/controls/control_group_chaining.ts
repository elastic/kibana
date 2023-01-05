/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { pick } from 'lodash';

import expect from '@kbn/expect';
import { OPTIONS_LIST_CONTROL } from '@kbn/controls-plugin/common';

import { OPTIONS_LIST_ANIMAL_SOUND_SUGGESTIONS } from '../../../page_objects/dashboard_page_controls';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const security = getService('security');
  const { common, console, dashboard, dashboardControls, header, timePicker } = getPageObjects([
    'dashboardControls',
    'timePicker',
    'dashboard',
    'console',
    'common',
    'header',
  ]);

  describe('Dashboard control group hierarchical chaining', () => {
    const newDocuments: Array<{ index: string; id: string }> = [];
    let controlIds: string[];

    const addDocument = async (index: string, document: string) => {
      await console.enterRequest('\nPOST ' + index + '/_doc/ \n{\n ' + document);
      await console.clickPlay();
      await header.waitUntilLoadingHasFinished();
      const response = JSON.parse(await console.getResponse());
      newDocuments.push({ index, id: response._id });
    };

    before(async () => {
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader', 'animals']);

      /* start by adding some incomplete data so that we can test `exists` query */
      await common.navigateToApp('console');
      await console.collapseHelp();
      await console.clearTextArea();
      await addDocument(
        'animals-cats-2018-01-01',
        '"@timestamp": "2018-01-01T16:00:00.000Z", \n"animal": "cat"'
      );
      await addDocument(
        'animals-dogs-2018-01-01',
        '"@timestamp": "2018-01-01T16:00:00.000Z", \n"name": "Max", \n"sound": "woof"'
      );

      /* then, create our testing dashboard */
      await common.navigateToApp('dashboard');
      await dashboard.gotoDashboardLandingPage();
      await dashboard.clickNewDashboard();
      await timePicker.setDefaultDataRange();

      // populate an initial set of controls and get their ids.
      await dashboardControls.createControl({
        controlType: OPTIONS_LIST_CONTROL,
        dataViewTitle: 'animals-*',
        fieldName: 'animal.keyword',
        title: 'Animal',
      });

      await dashboardControls.createControl({
        controlType: OPTIONS_LIST_CONTROL,
        dataViewTitle: 'animals-*',
        fieldName: 'name.keyword',
        title: 'Animal Name',
      });

      await dashboardControls.createControl({
        controlType: OPTIONS_LIST_CONTROL,
        dataViewTitle: 'animals-*',
        fieldName: 'sound.keyword',
        title: 'Animal Sound',
      });

      controlIds = await dashboardControls.getAllControlIds();
    });

    after(async () => {
      await common.navigateToApp('console');
      await console.collapseHelp();
      await console.clearTextArea();
      for (const { index, id } of newDocuments) {
        await console.enterRequest(`\nDELETE /${index}/_doc/${id}`);
        await console.clickPlay();
        await header.waitUntilLoadingHasFinished();
      }
      await security.testUser.restoreDefaults();
    });

    it('Shows all available options in first Options List control', async () => {
      await dashboardControls.optionsListOpenPopover(controlIds[0]);
      await retry.try(async () => {
        expect(await dashboardControls.optionsListPopoverGetAvailableOptionsCount()).to.be(2);
      });
      await dashboardControls.optionsListEnsurePopoverIsClosed(controlIds[0]);
    });

    it('Selecting an option in the first Options List will filter the second and third controls', async () => {
      await dashboardControls.optionsListOpenPopover(controlIds[0]);
      await dashboardControls.optionsListPopoverSelectOption('cat');
      await dashboardControls.optionsListEnsurePopoverIsClosed(controlIds[0]);

      await dashboardControls.ensureAvailableOptionsEqual(controlIds[1], {
        suggestions: { Tiger: 6, sylvester: 5 },
        invalidSelections: [],
      });
      const suggestions = pick(OPTIONS_LIST_ANIMAL_SOUND_SUGGESTIONS, [
        'hiss',
        'meow',
        'growl',
        'grr',
      ]);
      await dashboardControls.ensureAvailableOptionsEqual(controlIds[2], {
        suggestions: { ...suggestions, grr: suggestions.grr - 1 },
        invalidSelections: [],
      });
    });

    it('Selecting an option in the second Options List will filter the third control', async () => {
      await dashboardControls.optionsListOpenPopover(controlIds[1]);
      await dashboardControls.optionsListPopoverSelectOption('sylvester');
      await dashboardControls.optionsListEnsurePopoverIsClosed(controlIds[1]);
      const suggestions = pick(OPTIONS_LIST_ANIMAL_SOUND_SUGGESTIONS, ['meow', 'hiss']);
      await dashboardControls.ensureAvailableOptionsEqual(controlIds[2], {
        suggestions: { ...suggestions, hiss: suggestions.hiss - 3 },
        invalidSelections: [],
      });
    });

    it('Can select an option in the third Options List', async () => {
      await dashboardControls.optionsListOpenPopover(controlIds[2]);
      await dashboardControls.optionsListPopoverSelectOption('meow');
      await dashboardControls.optionsListEnsurePopoverIsClosed(controlIds[2]);
    });

    it('Selecting a conflicting option in the first control will validate the second and third controls', async () => {
      await dashboardControls.optionsListOpenPopover(controlIds[0]);
      await dashboardControls.optionsListPopoverClearSelections();
      await dashboardControls.optionsListPopoverSelectOption('dog');
      await dashboardControls.optionsListEnsurePopoverIsClosed(controlIds[0]);

      await dashboardControls.ensureAvailableOptionsEqual(controlIds[1], {
        suggestions: { Fluffy: 6, 'Fee Fee': 3, Rover: 3 },
        invalidSelections: ['sylvester'],
      });
      const suggestions = pick(OPTIONS_LIST_ANIMAL_SOUND_SUGGESTIONS, [
        'ruff',
        'bark',
        'grrr',
        'bow ow ow',
        'grr',
      ]);
      await dashboardControls.ensureAvailableOptionsEqual(controlIds[2], {
        suggestions: { ...suggestions, grr: suggestions.grr - 1 },
        invalidSelections: ['meow'],
      });
    });

    it('Excluding selections in the first control will validate the second and third controls', async () => {
      await dashboardControls.optionsListOpenPopover(controlIds[0]);
      await dashboardControls.optionsListPopoverSetIncludeSelections(false);
      await dashboardControls.optionsListEnsurePopoverIsClosed(controlIds[0]);

      await dashboardControls.ensureAvailableOptionsEqual(controlIds[1], {
        suggestions: { Tiger: 6, sylvester: 5, Max: 1 },
        invalidSelections: [],
      });
      const suggestions = pick(OPTIONS_LIST_ANIMAL_SOUND_SUGGESTIONS, ['meow', 'hiss']);
      await dashboardControls.ensureAvailableOptionsEqual(controlIds[2], {
        suggestions: { ...suggestions, hiss: suggestions.hiss - 3 },
        invalidSelections: [],
      });
    });

    it('Excluding all options of first control removes all options in second and third controls', async () => {
      await dashboardControls.optionsListOpenPopover(controlIds[0]);
      await dashboardControls.optionsListPopoverSelectOption('cat');
      await dashboardControls.optionsListEnsurePopoverIsClosed(controlIds[0]);

      await dashboardControls.optionsListOpenPopover(controlIds[1]);
      expect(await dashboardControls.optionsListPopoverGetAvailableOptionsCount()).to.be(1);
      await dashboardControls.optionsListOpenPopover(controlIds[2]);
      expect(await dashboardControls.optionsListPopoverGetAvailableOptionsCount()).to.be(1);
      await dashboardControls.optionsListEnsurePopoverIsClosed(controlIds[2]);
    });

    it('Creating "does not exist" query from first control filters the second and third controls', async () => {
      await dashboardControls.optionsListOpenPopover(controlIds[0]);
      await dashboardControls.optionsListPopoverSelectOption('exists');
      await dashboardControls.optionsListEnsurePopoverIsClosed(controlIds[0]);
      await dashboard.waitForRenderComplete();

      await dashboardControls.optionsListOpenPopover(controlIds[1]);
      await dashboardControls.optionsListPopoverClearSelections();
      expect(await dashboardControls.optionsListPopoverGetAvailableOptionsCount()).to.be(1);
      await dashboardControls.ensureAvailableOptionsEqual(
        controlIds[1],
        {
          suggestions: { Max: 1 },
          invalidSelections: [],
        },
        true
      );

      await dashboardControls.optionsListOpenPopover(controlIds[2]);
      await dashboardControls.optionsListPopoverClearSelections();
      expect(await dashboardControls.optionsListPopoverGetAvailableOptionsCount()).to.be(1);
      await dashboardControls.ensureAvailableOptionsEqual(
        controlIds[2],
        {
          suggestions: { woof: 1 },
          invalidSelections: [],
        },
        true
      );
      await dashboardControls.optionsListEnsurePopoverIsClosed(controlIds[2]);
    });

    it('Creating "exists" query from first control filters the second and third controls', async () => {
      await dashboardControls.optionsListOpenPopover(controlIds[0]);
      await dashboardControls.optionsListPopoverSetIncludeSelections(true);
      await dashboardControls.optionsListEnsurePopoverIsClosed(controlIds[0]);
      await dashboard.waitForRenderComplete();

      await dashboardControls.optionsListOpenPopover(controlIds[1]);
      let suggestionKeys = Object.keys(
        (await dashboardControls.optionsListPopoverGetAvailableOptions()).suggestions
      );
      expect(suggestionKeys).to.not.contain('Max');
      await dashboardControls.optionsListOpenPopover(controlIds[2]);
      suggestionKeys = Object.keys(
        (await dashboardControls.optionsListPopoverGetAvailableOptions()).suggestions
      );
      expect(suggestionKeys).to.not.contain('woof');
      await dashboardControls.optionsListEnsurePopoverIsClosed(controlIds[2]);
    });

    describe('Hierarchical chaining off', async () => {
      before(async () => {
        await dashboardControls.updateChainingSystem('NONE');
      });

      it('Selecting an option in the first Options List will not filter the second or third controls', async () => {
        await dashboardControls.optionsListOpenPopover(controlIds[0]);
        await dashboardControls.optionsListPopoverSelectOption('cat');
        await dashboardControls.optionsListEnsurePopoverIsClosed(controlIds[0]);

        await dashboardControls.ensureAvailableOptionsEqual(controlIds[1], {
          suggestions: { Fluffy: 6, Tiger: 6, sylvester: 5, 'Fee Fee': 3, Rover: 3, Max: 1 },
          invalidSelections: [],
        });
        await dashboardControls.ensureAvailableOptionsEqual(controlIds[2], {
          suggestions: { ...OPTIONS_LIST_ANIMAL_SOUND_SUGGESTIONS, woof: 1 },
          invalidSelections: [],
        });
      });
    });
  });
}
