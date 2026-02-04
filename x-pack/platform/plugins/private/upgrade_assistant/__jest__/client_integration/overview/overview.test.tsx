/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SemVer from 'semver/classes/semver';

import { LATEST_VERSION, MIN_VERSION_TO_UPGRADE_TO_LATEST } from '../../../common/constants';
import { setupEnvironment } from '../helpers/setup_environment';
import { setupOverviewPage } from './overview.helpers';

const currentMinVersion = new SemVer(MIN_VERSION_TO_UPGRADE_TO_LATEST);

describe('Overview Page', () => {
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];

  beforeEach(() => {
    const mockEnvironment = setupEnvironment();
    httpSetup = mockEnvironment.httpSetup;
  });

  describe('Documentation links', () => {
    test('Has a whatsNew link and it references target version', async () => {
      await setupOverviewPage(httpSetup);
      expect(screen.getByTestId('whatsNewLink')).toBeInTheDocument();
      expect(screen.getByTestId('whatsNewLink')).toHaveTextContent("What's new in version");
    });

    describe('current version can be upgrated to last one', () => {
      beforeEach(async () => {
        const versionMock = {
          currentMajor: currentMinVersion.major,
          currentMinor: currentMinVersion.minor,
          currentPatch: currentMinVersion.patch,
        };

        await setupOverviewPage(httpSetup, {
          kibanaVersionInfo: versionMock,
        });
      });

      test('Has the current version and the lastest avaiblable version', () => {
        expect(screen.getByTestId('overviewPageHeader')).toHaveTextContent(
          `Current version: ${currentMinVersion.version} | Latest available version: ${LATEST_VERSION}`
        );
      });

      test('Has not a tooltip when current version is major than min version to upgrade', () => {
        const header = screen.getByTestId('overviewPageHeader');
        expect(header.querySelector('.euiToolTipAnchor')).toBeNull();
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

        await setupOverviewPage(httpSetup, {
          kibanaVersionInfo: versionMock,
        });
      });

      test('Has the current version and the lastest avaiblable version', () => {
        expect(screen.getByTestId('overviewPageHeader')).toHaveTextContent(
          `Current version: ${outdatedMajor}.0.0 | Latest available version: ${LATEST_VERSION}`
        );
      });

      test('Has a tooltip when current version is minor than minor version to upgrade', async () => {
        const header = screen.getByTestId('overviewPageHeader');
        const tooltipAnchor = header.querySelector('.euiToolTipAnchor');
        expect(tooltipAnchor).not.toBeNull();
        fireEvent.mouseOver(tooltipAnchor!);
        await waitFor(() => {
          const toolTipText = document.querySelector('.euiToolTipPopover')?.textContent;
          expect(toolTipText).toBe(
            `Upgrading to v${LATEST_VERSION} requires v${MIN_VERSION_TO_UPGRADE_TO_LATEST}.`
          );
        });
      });
    });
  });
});
