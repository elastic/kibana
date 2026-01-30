/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import SemVer from 'semver/classes/semver';
import '@testing-library/jest-dom';

import { idForWarning, WarningFlyoutStep } from './warning_step';
import type {
  EnrichedDeprecationInfo,
  ReindexAction,
} from '../../../../../../../../../common/types';
import type { IndexWarning } from '@kbn/reindex-service-plugin/common';
import type { ReindexState } from '../../../use_reindex';
import { LoadingState } from '../../../../../../types';
import { renderWithI18n } from '@kbn/test-jest-helpers';

const kibanaVersion = new SemVer('8.0.0');

jest.mock('../../../../../../../app_context', () => {
  const { docLinksServiceMock } = jest.requireActual('@kbn/core-doc-links-browser-mocks');

  return {
    useAppContext: () => {
      return {
        services: {
          core: {
            docLinks: docLinksServiceMock.createStartContract(),
          },
          api: {
            useLoadNodeDiskSpace: jest.fn(() => ({ data: [] })),
          },
        },
      };
    },
  };
});

describe('WarningFlyoutStep', () => {
  const meta = {
    indexName: 'foo',
    reindexName: 'reindexed-foo',
    aliases: [],
    isInDataStream: false,
    isFrozen: false,
    isReadonly: false,
    isClosedIndex: false,
    isFollowerIndex: false,
  };
  const defaultProps = {
    warnings: [] as IndexWarning[],
    closeFlyout: jest.fn(),
    confirm: jest.fn(),
    flow: 'reindex' as const,
    meta,
    reindexState: {
      loadingState: LoadingState.Success,
      meta,
      hasRequiredPrivileges: true,
      reindexTaskPercComplete: null,
      errorMessage: null,
    } as ReindexState,
    deprecation: {
      index: 'foo',
      correctiveAction: {
        type: 'reindex',
      } as ReindexAction,
      level: 'critical',
      message: 'foo',
      resolveDuringUpgrade: false,
      type: 'index_settings',
    } as EnrichedDeprecationInfo,
  };

  it('renders', () => {
    renderWithI18n(<WarningFlyoutStep {...defaultProps} />);

    expect(screen.getByTestId('closeReindexButton')).toBeInTheDocument();
    expect(screen.getByTestId('startReindexingButton')).toBeEnabled();
    expect(screen.queryByText('Accept changes')).not.toBeInTheDocument();
  });

  if (kibanaVersion.major === 7) {
    it('does not allow proceeding until all are checked', async () => {
      const defaultPropsWithWarnings = {
        ...defaultProps,
        warnings: [
          {
            flow: 'all' as const,
            warningType: 'indexSetting',
            meta: {
              deprecatedSettings: ['index.force_memory_term_dictionary'],
            },
          },
        ] as IndexWarning[],
      };
      renderWithI18n(<WarningFlyoutStep {...defaultPropsWithWarnings} />);

      const button = screen.getByTestId('startReindexingButton');
      expect(button).toBeDisabled();

      fireEvent.click(button);
      expect(defaultPropsWithWarnings.confirm).not.toHaveBeenCalled();

      // first warning (indexSetting)
      const checkbox = document.getElementById(idForWarning(0));
      expect(checkbox).not.toBeNull();
      fireEvent.click(checkbox!);

      await waitFor(() => expect(button).toBeEnabled());
      fireEvent.click(button);

      expect(defaultPropsWithWarnings.confirm).toHaveBeenCalled();
    });
  }
});
