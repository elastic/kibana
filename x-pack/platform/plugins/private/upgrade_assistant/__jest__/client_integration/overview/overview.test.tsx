/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { waitFor } from '@testing-library/react';
import SemVer from 'semver/classes/semver';

import { LATEST_VERSION, MIN_VERSION_TO_UPGRADE_TO_LATEST } from '../../../common/constants';
import { setupEnvironment } from '../helpers';
import { OverviewTestBed, setupOverviewPage } from './overview.helpers';

const currentMinVersion = new SemVer(MIN_VERSION_TO_UPGRADE_TO_LATEST);

describe('Overview Page', () => {
  let testBed: OverviewTestBed;
  beforeEach(async () => {
    testBed = await setupOverviewPage(setupEnvironment().httpSetup);
    testBed.component.update();
  });

  describe('Documentation links', () => {
    test('Has a whatsNew link and it references target version', () => {
      const { exists, find } = testBed;

      expect(exists('whatsNewLink')).toBe(true);
      expect(find('whatsNewLink').text()).toContain("What's new in version");
    });

    describe('current version can be upgrated to last one', () => {
      beforeEach(async () => {
        const versionMock = {
          currentMajor: currentMinVersion.major,
          currentMinor: currentMinVersion.minor,
          currentPatch: currentMinVersion.patch,
        };

        await act(async () => {
          testBed = await setupOverviewPage(setupEnvironment().httpSetup, {
            kibanaVersionInfo: versionMock,
          });
        });

        testBed.component.update();
      });

      test('Has the current version and the lastest avaiblable version', () => {
        const { find } = testBed;

        expect(find('overviewPageHeader').text()).toContain(
          `Current version: ${currentMinVersion.version} | Latest available version: ${LATEST_VERSION}`
        );
      });

      test('Has not a tooltip when current version is major than min version to upgrade', () => {
        const { find } = testBed;
        expect(find('overviewPageHeader').find('.euiToolTipAnchor').exists()).toBe(false);
      });
    });
    describe('current version can not be upgrated to last one', () => {
      const outdatedMajor = currentMinVersion.major - 1;
      beforeEach(async () => {
        const versionMock = {
          currentMajor: outdatedMajor,
          currentMinor: 0,
          currentPatch: 0,
        };

        await act(async () => {
          testBed = await setupOverviewPage(setupEnvironment().httpSetup, {
            kibanaVersionInfo: versionMock,
          });
        });

        testBed.component.update();
      });

      test('Has the current version and the lastest avaiblable version', () => {
        const { find } = testBed;

        expect(find('overviewPageHeader').text()).toContain(
          `Current version: ${outdatedMajor}.0.0 | Latest available version: ${LATEST_VERSION}`
        );
      });

      test('Has a tooltip when current version is minor than minor version to upgrade', async () => {
        const { find } = testBed;

        await waitFor(() => {
          find('overviewPageHeader').find('.euiToolTipAnchor').first().simulate('mouseOver');
          const toolTipText = document.querySelector('.euiToolTipPopover')?.textContent;
          expect(toolTipText).toBe(
            `Upgrading to v${LATEST_VERSION} requires v${MIN_VERSION_TO_UPGRADE_TO_LATEST}.`
          );
        });
      });
    });
  });
});
